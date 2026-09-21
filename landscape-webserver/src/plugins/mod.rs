use std::{
    collections::HashMap,
    fs::{self as stdfs, OpenOptions},
    net::Ipv4Addr,
    path::{Component, Path, PathBuf},
    process::Stdio,
    sync::Arc,
};

use axum::extract::DefaultBodyLimit;
use axum::{
    Json, Router,
    body::Body,
    extract::{Multipart, Path as AxumPath, Query, State},
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
    routing::{any, delete, get, post},
};
use flate2::read::GzDecoder;
use landscape::sys_service::route::IpRouteService;
use landscape_common::{
    dev::get_interface_index_by_name, sys_service::route_service::RouteTargetInfo,
};
use serde::{Deserialize, Serialize};
use tokio::{
    fs,
    process::{Child, Command},
    sync::{Mutex, RwLock},
};
use utoipa::{OpenApi, ToSchema};

const MAX_MANIFEST_SIZE: usize = 64 * 1024;
const MAX_PACKAGE_SIZE: usize = 128 * 1024 * 1024;
const MAX_UNPACKED_SIZE: u64 = 512 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES: usize = 4096;
const RUNTIME_ROOT: &str = "/run/landscape/plugins";

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PluginPlatform {
    pub os: String,
    pub arch: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PluginService {
    pub kind: String,
    #[schema(value_type = String)]
    pub executable: PathBuf,
    #[schema(value_type = String)]
    pub default_config: PathBuf,
    #[serde(default)]
    pub run_args: Option<Vec<String>>,
    #[serde(default)]
    pub check_args: Option<Vec<String>>,
    #[serde(default)]
    pub auto_restart: Option<bool>,
}

impl PluginService {
    pub fn config_filename(&self) -> &str {
        self.default_config
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or("config.yaml")
    }

    pub fn resolve_run_args(
        &self,
        executable: &Path,
        data: &Path,
        config: &Path,
        namespace: &str,
    ) -> Vec<String> {
        if let Some(args) = &self.run_args {
            return Self::substitute_args(args, executable, data, config, namespace);
        }
        match self.kind.as_str() {
            "mihomo" => vec![
                "-d".into(),
                data.to_string_lossy().into_owned(),
                "-f".into(),
                config.to_string_lossy().into_owned(),
            ],
            "sing-box" => vec![
                "run".into(),
                "-c".into(),
                config.to_string_lossy().into_owned(),
                "-D".into(),
                data.to_string_lossy().into_owned(),
            ],
            "xray" | "v2ray" => vec![
                "run".into(),
                "-c".into(),
                config.to_string_lossy().into_owned(),
            ],
            _ => vec![
                "-c".into(),
                config.to_string_lossy().into_owned(),
            ],
        }
    }

    pub fn resolve_check_args(
        &self,
        executable: &Path,
        data: &Path,
        config: &Path,
        namespace: &str,
    ) -> Option<Vec<String>> {
        if let Some(args) = &self.check_args {
            return Some(Self::substitute_args(args, executable, data, config, namespace));
        }
        match self.kind.as_str() {
            "mihomo" => Some(vec![
                "-t".into(),
                "-d".into(),
                data.to_string_lossy().into_owned(),
                "-f".into(),
                config.to_string_lossy().into_owned(),
            ]),
            "sing-box" => Some(vec![
                "check".into(),
                "-c".into(),
                config.to_string_lossy().into_owned(),
                "-D".into(),
                data.to_string_lossy().into_owned(),
            ]),
            "xray" | "v2ray" => Some(vec![
                "test".into(),
                "-c".into(),
                config.to_string_lossy().into_owned(),
            ]),
            _ => None,
        }
    }

    fn substitute_args(
        templates: &[String],
        executable: &Path,
        data: &Path,
        config: &Path,
        namespace: &str,
    ) -> Vec<String> {
        let exe_str = executable.to_string_lossy();
        let data_str = data.to_string_lossy();
        let config_str = config.to_string_lossy();
        templates
            .iter()
            .map(|arg| {
                arg.replace("{executable}", &exe_str)
                    .replace("{data}", &data_str)
                    .replace("{config}", &config_str)
                    .replace("{namespace}", namespace)
            })
            .collect()
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PluginNetwork {
    #[serde(default)]
    pub namespace: Option<String>,
    #[serde(default = "default_peer_interface")]
    pub peer_interface: String,
    #[serde(default = "default_tproxy_port")]
    pub tproxy_port: u16,
    #[serde(default = "default_host_ipv4")]
    #[schema(value_type = String)]
    pub host_ipv4: Ipv4Addr,
    #[serde(default = "default_peer_ipv4")]
    #[schema(value_type = String)]
    pub peer_ipv4: Ipv4Addr,
}

impl Default for PluginNetwork {
    fn default() -> Self {
        Self {
            namespace: None,
            peer_interface: default_peer_interface(),
            tproxy_port: default_tproxy_port(),
            host_ipv4: default_host_ipv4(),
            peer_ipv4: default_peer_ipv4(),
        }
    }
}

fn default_peer_interface() -> String {
    "plugin0".into()
}

const fn default_tproxy_port() -> u16 {
    12345
}

const fn default_host_ipv4() -> Ipv4Addr {
    Ipv4Addr::new(100, 64, 127, 1)
}

const fn default_peer_ipv4() -> Ipv4Addr {
    Ipv4Addr::new(100, 64, 127, 2)
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PluginManifest {
    pub protocol_version: u16,
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub platform: Option<PluginPlatform>,
    #[serde(default)]
    pub service: Option<PluginService>,
    pub host_interface: String,
    #[schema(value_type = String)]
    pub controller_socket: PathBuf,
    #[serde(default = "default_ui_path")]
    pub ui_path: String,
    #[serde(default)]
    pub network: PluginNetwork,
}

fn default_ui_path() -> String {
    "/ui/".into()
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct PluginInfo {
    #[serde(flatten)]
    pub manifest: PluginManifest,
    pub interface_ready: bool,
    pub tproxy_ready: bool,
    pub controller_ready: bool,
    pub service_running: bool,
    pub trust: &'static str,
}

#[derive(Clone)]
pub struct PluginManager {
    dir: PathBuf,
    route_service: IpRouteService,
    manifests: Arc<RwLock<HashMap<String, PluginManifest>>>,
    handlers: Arc<Mutex<HashMap<String, Child>>>,
    services: Arc<Mutex<HashMap<String, Child>>>,
    user_stopped: Arc<Mutex<std::collections::HashSet<String>>>,
    restart_failures: Arc<Mutex<HashMap<String, (u32, std::time::Instant)>>>,
}

impl PluginManager {
    fn route_key(id: &str) -> String {
        format!("plugin:{id}")
    }

    pub async fn new(home: &Path, route_service: IpRouteService) -> Result<Self, String> {
        let manager = Self {
            dir: home.join("plugins"),
            route_service,
            manifests: Arc::new(RwLock::new(HashMap::new())),
            handlers: Arc::new(Mutex::new(HashMap::new())),
            services: Arc::new(Mutex::new(HashMap::new())),
            user_stopped: Arc::new(Mutex::new(std::collections::HashSet::new())),
            restart_failures: Arc::new(Mutex::new(HashMap::new())),
        };
        fs::create_dir_all(&manager.dir).await.map_err(|e| e.to_string())?;
        manager.reload().await;

        let watchdog_manager = manager.clone();
        tokio::spawn(async move {
            watchdog_manager.watchdog_loop().await;
        });

        Ok(manager)
    }

    async fn watchdog_loop(&self) {
        let mut ticker = tokio::time::interval(tokio::time::Duration::from_secs(3));
        loop {
            ticker.tick().await;
            self.watchdog_tick().await;
        }
    }

    fn is_service_enabled(&self, id: &str) -> bool {
        self.plugin_dir(id).join("service.enabled").is_file()
    }

    async fn watchdog_tick(&self) {
        let manifests = self.manifests.read().await.clone();
        for (id, manifest) in manifests {
            let Some(service) = &manifest.service else { continue };
            if service.auto_restart == Some(false) {
                continue;
            }

            if !self.is_service_enabled(&id) || self.user_stopped.lock().await.contains(&id) {
                continue;
            }

            let running = self.service_running(&id).await;
            if running {
                let mut failures = self.restart_failures.lock().await;
                if let Some((count, _)) = failures.get_mut(&id) {
                    if *count > 0 {
                        *count = 0;
                    }
                }
                continue;
            }

            let mut failures = self.restart_failures.lock().await;
            let now = std::time::Instant::now();
            let (attempts, last_attempt) = failures.entry(id.clone()).or_insert((0, now));

            if *attempts >= 3 {
                if now.duration_since(*last_attempt) < std::time::Duration::from_secs(60) {
                    continue;
                }
                *attempts = 0;
            }

            let delay_secs = match *attempts {
                0 => 0,
                1 => 1,
                _ => 2,
            };
            if *attempts > 0
                && now.duration_since(*last_attempt) < std::time::Duration::from_secs(delay_secs)
            {
                continue;
            }

            *attempts += 1;
            *last_attempt = now;
            tracing::warn!(
                plugin = %id,
                attempt = *attempts,
                "plugin service stopped unexpectedly, attempting auto-restart"
            );
            drop(failures);

            if let Err(err) = self.start_service(&manifest).await {
                tracing::error!(plugin = %id, %err, "watchdog failed to restart plugin service");
            } else {
                tracing::info!(plugin = %id, "watchdog successfully restarted plugin service");
            }
        }
    }

    async fn reload(&self) {
        let Ok(mut entries) = fs::read_dir(&self.dir).await else { return };
        while let Ok(Some(entry)) = entries.next_entry().await {
            let entry_path = entry.path();
            let path = if entry_path.is_dir() {
                entry_path.join("manifest.json")
            } else if entry_path.extension().and_then(|v| v.to_str()) == Some("json") {
                entry_path
            } else {
                continue;
            };
            let Ok(bytes) = fs::read(&path).await else { continue };
            let Ok(mut manifest) = serde_json::from_slice::<PluginManifest>(&bytes) else { continue };
            let mut manifest_changed = false;
            if manifest.network.host_ipv4 == Ipv4Addr::new(169, 254, 127, 1) {
                manifest.network.host_ipv4 = Ipv4Addr::new(100, 64, 127, 1);
                manifest_changed = true;
            }
            if manifest.network.peer_ipv4 == Ipv4Addr::new(169, 254, 127, 2) {
                manifest.network.peer_ipv4 = Ipv4Addr::new(100, 64, 127, 2);
                manifest_changed = true;
            }
            if manifest_changed {
                let _ = fs::write(&path, serde_json::to_vec_pretty(&manifest).unwrap_or_default()).await;
            }
            if self.validate(&manifest).is_ok() {
                if let Err(error) = self.install(&manifest).await {
                    tracing::warn!(plugin = %manifest.id, %error, "failed to restore plugin runtime");
                }
                if self.is_service_enabled(&manifest.id) {
                    if let Err(error) = self.start_service(&manifest).await {
                        tracing::warn!(plugin = %manifest.id, %error, "failed to auto-start plugin service");
                    }
                } else {
                    self.user_stopped.lock().await.insert(manifest.id.clone());
                    remove_masquerade(&manifest).await;
                }
                self.manifests.write().await.insert(manifest.id.clone(), manifest);
            }
        }
    }

    fn validate(&self, manifest: &PluginManifest) -> Result<(), String> {
        if manifest.protocol_version != 1 {
            return Err("unsupported plugin protocol".into());
        }
        if manifest.id.is_empty()
            || manifest.id.len() > 32
            || !manifest.id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
        {
            return Err("plugin id may only contain letters, numbers, '-' and '_'".into());
        }
        if manifest.name.trim().is_empty() || manifest.host_interface.trim().is_empty() {
            return Err("plugin name and host_interface are required".into());
        }
        if !valid_network_name(&manifest.host_interface, 15) {
            return Err("host_interface must be a valid Linux interface name".into());
        }
        if !valid_network_name(&manifest.network.peer_interface, 15) {
            return Err("peer_interface must be a valid Linux interface name".into());
        }
        let namespace = self.namespace(manifest);
        if !valid_network_name(&namespace, 64) {
            return Err("namespace must contain only letters, numbers, '-' and '_'".into());
        }
        if manifest.network.tproxy_port == 0 {
            return Err("tproxy_port must be greater than zero".into());
        }
        if manifest.network.host_ipv4 == manifest.network.peer_ipv4
            || manifest.network.host_ipv4.is_unspecified()
            || manifest.network.peer_ipv4.is_unspecified()
        {
            return Err("host_ipv4 and peer_ipv4 must be distinct addresses".into());
        }
        if !manifest.controller_socket.is_absolute() {
            return Err("controller_socket must be an absolute path".into());
        }
        if manifest
            .controller_socket
            .components()
            .any(|component| component == Component::ParentDir)
        {
            return Err("controller_socket may not contain '..'".into());
        }
        let socket_root = Path::new(RUNTIME_ROOT).join(&manifest.id);
        if !manifest.controller_socket.starts_with(socket_root) {
            return Err("controller_socket must be inside /run/landscape/plugins/<id>".into());
        }
        if !manifest.ui_path.starts_with('/') {
            return Err("ui_path must start with '/'".into());
        }
        if let Some(platform) = &manifest.platform {
            if platform.os != std::env::consts::OS || platform.arch != std::env::consts::ARCH {
                return Err(format!(
                    "package targets {}/{}, host is {}/{}",
                    platform.os,
                    platform.arch,
                    std::env::consts::OS,
                    std::env::consts::ARCH
                ));
            }
        }
        if let Some(service) = &manifest.service {
            if service.kind.trim().is_empty() {
                return Err("service kind is required".into());
            }
            validate_package_path(&service.executable)?;
            validate_package_path(&service.default_config)?;
        }
        Ok(())
    }

    fn namespace(&self, manifest: &PluginManifest) -> String {
        manifest.network.namespace.clone().unwrap_or_else(|| format!("land-{}", manifest.id))
    }

    fn plugin_dir(&self, id: &str) -> PathBuf {
        self.dir.join(id)
    }

    pub fn detect_ui_subpath(&self, manifest: &PluginManifest) -> Option<String> {
        let plugin_dir = self.plugin_dir(&manifest.id);
        let candidates = [
            plugin_dir.join("data").join("ui"),
            plugin_dir.join("ui"),
        ];
        for dir in &candidates {
            if !dir.is_dir() {
                continue;
            }
            if dir.join("index.html").is_file() {
                return None;
            }
            for name in &["zashboard", "dist", "metacubexd", "yacd"] {
                if dir.join(name).join("index.html").is_file() {
                    return Some((*name).to_string());
                }
            }
            if let Ok(entries) = stdfs::read_dir(dir) {
                for entry in entries.flatten() {
                    if let Ok(file_type) = entry.file_type() {
                        if file_type.is_dir() && entry.path().join("index.html").is_file() {
                            if let Ok(name) = entry.file_name().into_string() {
                                return Some(name);
                            }
                        }
                    }
                }
            }
        }
        None
    }

    fn enrich_manifest_ui(&self, mut manifest: PluginManifest) -> PluginManifest {
        if manifest.service.as_ref().map(|s| s.kind.as_str()) == Some("mihomo") || manifest.id == "mihomo" {
            if let Some(sub) = self.detect_ui_subpath(&manifest) {
                manifest.ui_path = format!("/ui/{sub}/");
            } else if manifest.ui_path == "/ui/" || manifest.ui_path == "/ui" {
                manifest.ui_path = "/ui/zashboard/".to_string();
            }
        }
        manifest
    }

    fn base_config_path(&self, id: &str, service: &PluginService) -> PathBuf {
        self.plugin_dir(id).join("config").join(service.config_filename())
    }

    fn override_config_path(&self, id: &str) -> PathBuf {
        self.plugin_dir(id).join("config").join("override.yaml")
    }

    fn effective_config_path(&self, id: &str, service: &PluginService) -> PathBuf {
        self.plugin_dir(id).join("config").join(format!("effective.{}", service.config_filename()))
    }

    async fn build_effective_config_with_override(
        &self,
        manifest: &PluginManifest,
        base_override: Option<&Path>,
        override_override: Option<&Path>,
    ) -> Result<String, String> {
        let service = manifest.service.as_ref().ok_or("plugin has no managed service")?;
        let base_path = base_override
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| self.base_config_path(&manifest.id, service));
        let override_path = override_override
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| self.override_config_path(&manifest.id));

        let base_str = if base_path.exists() {
            fs::read_to_string(&base_path).await.map_err(|e| e.to_string())?
        } else {
            let bundled = self.plugin_dir(&manifest.id).join("package").join(&service.default_config);
            if bundled.exists() {
                fs::read_to_string(&bundled).await.map_err(|e| e.to_string())?
            } else {
                String::new()
            }
        };

        let mut base_val: serde_yaml::Value = if base_str.trim().is_empty() {
            serde_yaml::Value::Mapping(Default::default())
        } else {
            serde_yaml::from_str(&base_str).map_err(|e| format!("Base config YAML parse error: {e}"))?
        };

        if override_path.exists() {
            let override_str = fs::read_to_string(&override_path).await.unwrap_or_default();
            if !override_str.trim().is_empty() {
                let override_val = serde_yaml::from_str::<serde_yaml::Value>(&override_str)
                    .map_err(|e| format!("Override config YAML parse error: {e}"))?;
                deep_merge_yaml(&mut base_val, &override_val);
            }
        }

        if let serde_yaml::Value::Mapping(map) = &mut base_val {
            let tproxy_key = serde_yaml::Value::String("tproxy-port".into());
            let socket_key = serde_yaml::Value::String("external-controller-unix".into());
            let ext_ctrl_key = serde_yaml::Value::String("external-controller".into());
            let dns_key = serde_yaml::Value::String("dns".into());
            let nameserver_key = serde_yaml::Value::String("nameserver".into());
            let enable_key = serde_yaml::Value::String("enable".into());

            if service.kind == "mihomo" {
                if !map.contains_key(&tproxy_key) {
                    map.insert(
                        tproxy_key,
                        serde_yaml::Value::Number((manifest.network.tproxy_port as u64).into()),
                    );
                }
                if !map.contains_key(&socket_key) {
                    map.insert(
                        socket_key,
                        serde_yaml::Value::String(manifest.controller_socket.to_string_lossy().into_owned()),
                    );
                }
                if !map.contains_key(&ext_ctrl_key) {
                    map.insert(
                        ext_ctrl_key,
                        serde_yaml::Value::String("0.0.0.0:9090".into()),
                    );
                }
                let host_dns = serde_yaml::Value::String(manifest.network.host_ipv4.to_string());
                let dns_entry = map.entry(dns_key).or_insert_with(|| serde_yaml::Value::Mapping(Default::default()));
                if let serde_yaml::Value::Mapping(dns_map) = dns_entry {
                    dns_map.insert(enable_key, serde_yaml::Value::Bool(true));
                    let ns_entry = dns_map.entry(nameserver_key).or_insert_with(|| serde_yaml::Value::Sequence(Vec::new()));
                    if let serde_yaml::Value::Sequence(ns_seq) = ns_entry {
                        if !ns_seq.contains(&host_dns) {
                            ns_seq.insert(0, host_dns);
                        }
                    }
                }
            }

            let ext_ui_key = serde_yaml::Value::String("external-ui".into());
            if let Some(serde_yaml::Value::String(s)) = map.get(&ext_ui_key) {
                if s.trim().is_empty() {
                    map.remove(&ext_ui_key);
                }
            }
        }

        serde_yaml::to_string(&base_val).map_err(|e| format!("YAML serialization error: {e}"))
    }

    async fn prepare_dirs(&self, manifest: &PluginManifest) -> Result<(), String> {
        let plugin_dir = self.plugin_dir(&manifest.id);
        for path in [
            plugin_dir.clone(),
            plugin_dir.join("config"),
            plugin_dir.join("data"),
            plugin_dir.join("logs"),
            plugin_dir.join("ui"),
            Path::new(RUNTIME_ROOT).join(&manifest.id),
        ] {
            fs::create_dir_all(path).await.map_err(|e| e.to_string())?;
        }
        if let Some(parent) = manifest.controller_socket.parent() {
            fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    async fn prepare_configs(&self, manifest: &PluginManifest) -> Result<(), String> {
        let Some(service) = &manifest.service else { return Ok(()) };
        let plugin_dir = self.plugin_dir(&manifest.id);
        let bundled_config = plugin_dir.join("package").join(&service.default_config);
        let base_config = self.base_config_path(&manifest.id, service);
        if bundled_config.is_file() && !base_config.exists() {
            fs::copy(&bundled_config, &base_config).await.map_err(|e| e.to_string())?;
        }
        let override_config = self.override_config_path(&manifest.id);
        if !override_config.exists() {
            let default_override = format!(
                "# Landscape plugin runtime override\ntproxy-port: {}\nexternal-controller: 0.0.0.0:9090\nexternal-controller-unix: {}\nexternal-ui: \"\"\ndns:\n  enable: true\n  nameserver:\n    - {}\n",
                manifest.network.tproxy_port,
                manifest.controller_socket.display(),
                manifest.network.host_ipv4,
            );
            let _ = fs::write(&override_config, default_override).await;
        } else if let Ok(content) = fs::read_to_string(&override_config).await {
            if content.contains("169.254.127.1") {
                let updated = content.replace("169.254.127.1", &manifest.network.host_ipv4.to_string());
                let _ = fs::write(&override_config, updated).await;
            }
        }

        let effective_content = self.build_effective_config_with_override(manifest, None, None).await?;
        let effective_config = self.effective_config_path(&manifest.id, service);
        fs::write(&effective_config, &effective_content).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn install(&self, manifest: &PluginManifest) -> Result<(), String> {
        self.prepare_dirs(manifest).await?;
        self.setup_network(manifest).await?;
        self.prepare_configs(manifest).await?;
        self.start_tproxy(manifest).await?;
        self.register(manifest).await;
        Ok(())
    }

    async fn start_service(&self, manifest: &PluginManifest) -> Result<(), String> {
        let Some(service) = &manifest.service else { return Ok(()) };
        {
            let mut services = self.services.lock().await;
            if let Some(child) = services.get_mut(&manifest.id) {
                if child.try_wait().map_err(|e| e.to_string())?.is_none() {
                    return Ok(());
                }
            }
            services.remove(&manifest.id);
        }

        let plugin_dir = self.plugin_dir(&manifest.id);
        let executable = plugin_dir.join("package").join(&service.executable);
        let bundled_config = plugin_dir.join("package").join(&service.default_config);
        if !executable.is_file() || !bundled_config.is_file() {
            return Err("package executable or default config is missing".into());
        }
        self.prepare_configs(manifest).await?;
        let effective_config = self.effective_config_path(&manifest.id, service);

        let namespace = self.namespace(manifest);
        let data = plugin_dir.join("data");
        self.check_service_config(manifest, &executable, &data, &effective_config).await?;
        setup_masquerade(manifest).await?;
        let log = OpenOptions::new()
            .create(true)
            .append(true)
            .open(plugin_dir.join("logs/service.log"))
            .map_err(|e| e.to_string())?;
        let run_args = service.resolve_run_args(&executable, &data, &effective_config, &namespace);
        let mut cmd = Command::new("ip");
        cmd.args(["netns", "exec", &namespace]);
        cmd.arg(&executable);
        cmd.args(&run_args);
        cmd.stdin(Stdio::null())
            .stdout(Stdio::from(log.try_clone().map_err(|e| e.to_string())?))
            .stderr(Stdio::from(log))
            .kill_on_drop(true);
        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                remove_masquerade(manifest).await;
                return Err(e.to_string());
            }
        };
        tokio::time::sleep(tokio::time::Duration::from_millis(250)).await;
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            remove_masquerade(manifest).await;
            return Err(format!("{} exited with {status}", service.kind));
        }
        self.services.lock().await.insert(manifest.id.clone(), child);
        Ok(())
    }

    async fn check_service_config(
        &self,
        manifest: &PluginManifest,
        executable: &Path,
        data: &Path,
        config: &Path,
    ) -> Result<(), String> {
        let Some(service) = &manifest.service else { return Ok(()) };
        let namespace = self.namespace(manifest);
        let Some(check_args) = service.resolve_check_args(executable, data, config, &namespace) else {
            return Ok(());
        };
        // Prefer running check directly on host so host DNS and outbound network
        // are available for downloading required geo resources (like Country.mmdb)
        // even if the plugin service has not been started yet or netns is offline.
        let output = match Command::new(executable).args(&check_args).output().await {
            Ok(out) => out,
            Err(_) if netns_exists(&namespace).await.unwrap_or(false) => {
                let mut cmd = Command::new("ip");
                cmd.args(["netns", "exec", &namespace]);
                cmd.arg(executable);
                cmd.args(&check_args);
                cmd.output().await.map_err(|e| e.to_string())?
            }
            Err(e) => return Err(e.to_string()),
        };
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            let detail = if !stderr.trim().is_empty() {
                stderr.trim().to_string()
            } else {
                stdout.trim().to_string()
            };
            return Err(format!("{} config check failed: {}", service.kind, detail));
        }
        Ok(())
    }

    async fn stop_service(&self, id: &str, force: bool) {
        let child_opt = {
            let mut services = self.services.lock().await;
            services.remove(id)
        };
        if let Some(mut child) = child_opt {
            if force {
                let _ = child.kill().await;
                let _ = child.wait().await;
            } else {
                #[cfg(unix)]
                {
                    use nix::sys::signal::{self, Signal};
                    use nix::unistd::Pid;
                    if let Some(pid) = child.id() {
                        let _ = signal::kill(Pid::from_raw(pid as i32), Signal::SIGTERM);
                    }
                }
                #[cfg(not(unix))]
                {
                    let _ = child.kill().await;
                }

                match tokio::time::timeout(tokio::time::Duration::from_secs(3), child.wait()).await {
                    Ok(_) => {}
                    Err(_) => {
                        tracing::warn!(
                            plugin = %id,
                            "service did not exit within 3s after SIGTERM, force killing"
                        );
                        let _ = child.kill().await;
                        let _ = child.wait().await;
                    }
                }
            }
        }
        if let Some(manifest) = self.get(id).await {
            remove_masquerade(&manifest).await;
        }
    }

    async fn service_running(&self, id: &str) -> bool {
        let mut services = self.services.lock().await;
        let Some(child) = services.get_mut(id) else { return false };
        matches!(child.try_wait(), Ok(None))
    }

    async fn setup_network(&self, manifest: &PluginManifest) -> Result<(), String> {
        let namespace = self.namespace(manifest);
        let owned_marker = self.plugin_dir(&manifest.id).join("network.owned");
        let owned_namespace = fs::read_to_string(&owned_marker).await.ok();

        if let Some(old_namespace) = owned_namespace.as_deref() {
            if old_namespace != namespace {
                remove_network(old_namespace, &manifest.host_interface).await?;
                let _ = fs::remove_file(&owned_marker).await;
            }
        }

        let host_exists = get_interface_index_by_name(&manifest.host_interface).is_some();
        let namespace_exists = netns_exists(&namespace).await?;

        if host_exists != namespace_exists {
            if !owned_marker.exists() {
                return Err("plugin namespace and host interface are inconsistent".into());
            }
            let owned_namespace =
                fs::read_to_string(&owned_marker).await.unwrap_or_else(|_| namespace.clone());
            remove_network(owned_namespace.trim(), &manifest.host_interface).await?;
        }

        if !netns_exists(&namespace).await?
            && get_interface_index_by_name(&manifest.host_interface).is_none()
        {
            run_ip(&["netns", "add", &namespace]).await?;
            if let Err(error) = create_veth(manifest, &namespace).await {
                let _ = run_ip(&["netns", "del", &namespace]).await;
                return Err(error);
            }
            fs::write(&owned_marker, namespace.as_bytes()).await.map_err(|e| e.to_string())?;
        }

        run_ip(&["link", "set", &manifest.host_interface, "up"]).await?;
        run_ip(&["netns", "exec", &namespace, "ip", "link", "set", "lo", "up"]).await?;
        run_ip(&[
            "netns",
            "exec",
            &namespace,
            "ip",
            "link",
            "set",
            &manifest.network.peer_interface,
            "up",
        ])
        .await?;

        if manifest.service.is_some() {
            let host_cidr = format!("{}/30", manifest.network.host_ipv4);
            let peer_cidr = format!("{}/30", manifest.network.peer_ipv4);
            let gateway = manifest.network.host_ipv4.to_string();
            run_ip(&["addr", "replace", &host_cidr, "dev", &manifest.host_interface]).await?;
            run_ip(&[
                "netns",
                "exec",
                &namespace,
                "ip",
                "addr",
                "replace",
                &peer_cidr,
                "dev",
                &manifest.network.peer_interface,
            ])
            .await?;
            run_ip(&[
                "netns", "exec", &namespace, "ip", "route", "replace", "default", "via", &gateway,
            ])
            .await?;
            if let Err(error) = setup_netns_dns(&namespace, &manifest.network.host_ipv4).await {
                tracing::warn!(plugin = %manifest.id, %error, "NetNS DNS setup failed");
            }
        }

        add_ip_rule(&namespace, false, "0x1/0x1", "100").await?;
        run_ip(&[
            "netns", "exec", &namespace, "ip", "route", "replace", "local", "default", "dev", "lo",
            "table", "100",
        ])
        .await?;

        if let Err(error) = add_ip_rule(&namespace, true, "0x1", "106").await {
            tracing::warn!(plugin = %manifest.id, %error, "IPv6 TProxy rule is unavailable");
        } else if let Err(error) = run_ip(&[
            "netns", "exec", &namespace, "ip", "-6", "route", "replace", "local", "::/0", "dev",
            "lo", "table", "106",
        ])
        .await
        {
            tracing::warn!(plugin = %manifest.id, %error, "IPv6 TProxy route is unavailable");
        }

        Ok(())
    }

    async fn start_tproxy(&self, manifest: &PluginManifest) -> Result<(), String> {
        {
            let mut handlers = self.handlers.lock().await;
            if let Some(child) = handlers.get_mut(&manifest.id) {
                if child.try_wait().map_err(|e| e.to_string())?.is_none() {
                    return Ok(());
                }
            }
            handlers.remove(&manifest.id);
        }

        let handler = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .with_file_name("redirect_pkg_handler");
        if !handler.is_file() {
            return Err(format!("TProxy handler not found: {}", handler.display()));
        }

        let log = OpenOptions::new()
            .create(true)
            .append(true)
            .open(self.plugin_dir(&manifest.id).join("logs/tproxy.log"))
            .map_err(|e| e.to_string())?;
        let port = manifest.network.tproxy_port.to_string();
        let namespace = self.namespace(manifest);
        let mut child = Command::new("ip")
            .args(["netns", "exec", &namespace])
            .arg(handler)
            .args(["--standalone", "--sport", &port, "--mode", "tproxy"])
            .stdin(Stdio::null())
            .stdout(Stdio::from(log.try_clone().map_err(|e| e.to_string())?))
            .stderr(Stdio::from(log))
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| e.to_string())?;

        tokio::time::sleep(tokio::time::Duration::from_millis(250)).await;
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            return Err(format!("TProxy handler exited with {status}"));
        }
        self.handlers.lock().await.insert(manifest.id.clone(), child);
        Ok(())
    }

    async fn stop_tproxy(&self, id: &str) {
        if let Some(mut child) = self.handlers.lock().await.remove(id) {
            let _ = child.kill().await;
        }
    }

    async fn tproxy_ready(&self, id: &str) -> bool {
        let mut handlers = self.handlers.lock().await;
        let Some(child) = handlers.get_mut(id) else { return false };
        matches!(child.try_wait(), Ok(None))
    }

    async fn register(&self, manifest: &PluginManifest) {
        let Some(ifindex) = get_interface_index_by_name(&manifest.host_interface) else { return };
        let route_key = Self::route_key(&manifest.id);
        let (ipv4, ipv6) = RouteTargetInfo::docker_new(ifindex, &route_key);
        self.route_service.insert_ipv4_wan_route(&route_key, ipv4).await;
        self.route_service.insert_ipv6_wan_route(&route_key, ipv6).await;
    }

    async fn list(&self) -> Vec<PluginInfo> {
        let manifests: Vec<_> = self.manifests.read().await.values().cloned().collect();
        for manifest in &manifests {
            if get_interface_index_by_name(&manifest.host_interface).is_some() {
                if !self.tproxy_ready(&manifest.id).await {
                    if let Err(error) = self.start_tproxy(manifest).await {
                        tracing::warn!(plugin = %manifest.id, %error, "failed to restart TProxy handler");
                    }
                }
                self.register(manifest).await;
            } else {
                let route_key = Self::route_key(&manifest.id);
                self.route_service.remove_ipv4_wan_route(&route_key).await;
                self.route_service.remove_ipv6_wan_route(&route_key).await;
            }
        }
        let mut result = Vec::with_capacity(manifests.len());
        for manifest in manifests {
            let manifest = self.enrich_manifest_ui(manifest);
            result.push(PluginInfo {
                interface_ready: get_interface_index_by_name(&manifest.host_interface).is_some(),
                tproxy_ready: self.tproxy_ready(&manifest.id).await,
                controller_ready: manifest.controller_socket.exists(),
                service_running: self.service_running(&manifest.id).await,
                trust: "UNVERIFIED_SOURCE",
                manifest,
            });
        }
        result
    }

    async fn import(&self, bytes: &[u8]) -> Result<PluginInfo, String> {
        let staging = tempfile::Builder::new()
            .prefix(".import-")
            .tempdir_in(&self.dir)
            .map_err(|e| e.to_string())?;
        extract_package(bytes, staging.path())?;
        let manifest_bytes = stdfs::read(staging.path().join("manifest.json"))
            .map_err(|_| "package must contain manifest.json".to_string())?;
        if manifest_bytes.len() > MAX_MANIFEST_SIZE {
            return Err("manifest is too large".into());
        }
        let manifest: PluginManifest =
            serde_json::from_slice(&manifest_bytes).map_err(|e| e.to_string())?;
        self.validate(&manifest)?;
        if manifest.service.is_none()
            || manifest.platform.is_none()
            || manifest.version.as_deref().unwrap_or("").is_empty()
        {
            return Err("package manifest requires version, platform and service".into());
        }
        let package_dir = self.plugin_dir(&manifest.id).join("package");
        if package_dir.exists() {
            return Err("plugin package is already installed; remove it before reinstalling".into());
        }
        fs::create_dir_all(self.plugin_dir(&manifest.id)).await.map_err(|e| e.to_string())?;
        let staged_path = staging.keep();
        fs::rename(&staged_path, &package_dir).await.map_err(|e| e.to_string())?;
        if let Some(service) = &manifest.service {
            set_executable(&package_dir.join(&service.executable))?;
        }
        if let Err(error) = self.install(&manifest).await {
            self.stop_service(&manifest.id, true).await;
            self.stop_tproxy(&manifest.id).await;
            let route_key = Self::route_key(&manifest.id);
            self.route_service.remove_ipv4_wan_route(&route_key).await;
            self.route_service.remove_ipv6_wan_route(&route_key).await;
            let owned_marker = self.plugin_dir(&manifest.id).join("network.owned");
            if owned_marker.exists() {
                remove_masquerade(&manifest).await;
                let _ = remove_network(&self.namespace(&manifest), &manifest.host_interface).await;
                let _ = fs::remove_file(owned_marker).await;
            }
            let _ = fs::remove_dir_all(&package_dir).await;
            let _ = fs::remove_dir_all(Path::new(RUNTIME_ROOT).join(&manifest.id)).await;
            return Err(error);
        }
        let path = self.plugin_dir(&manifest.id).join("manifest.json");
        let encoded = serde_json::to_vec_pretty(&manifest).map_err(|e| e.to_string())?;
        fs::write(path, encoded).await.map_err(|e| e.to_string())?;
        let _ = fs::remove_file(self.dir.join(format!("{}.json", manifest.id))).await;
        self.user_stopped.lock().await.insert(manifest.id.clone());
        self.register(&manifest).await;
        self.manifests.write().await.insert(manifest.id.clone(), manifest.clone());
        let info_manifest = self.enrich_manifest_ui(manifest);
        Ok(PluginInfo {
            interface_ready: get_interface_index_by_name(&info_manifest.host_interface).is_some(),
            tproxy_ready: self.tproxy_ready(&info_manifest.id).await,
            controller_ready: info_manifest.controller_socket.exists(),
            service_running: self.service_running(&info_manifest.id).await,
            trust: "UNVERIFIED_SOURCE",
            manifest: info_manifest,
        })
    }

    async fn remove(&self, id: &str) -> Result<(), String> {
        let manifest = self.manifests.write().await.remove(id).ok_or("plugin not found")?;
        let _ = fs::remove_file(self.plugin_dir(id).join("service.enabled")).await;
        self.user_stopped.lock().await.remove(id);
        self.restart_failures.lock().await.remove(id);
        self.stop_service(id, true).await;
        self.stop_tproxy(id).await;
        let route_key = Self::route_key(id);
        self.route_service.remove_ipv4_wan_route(&route_key).await;
        self.route_service.remove_ipv6_wan_route(&route_key).await;
        let plugin_dir = self.plugin_dir(id);
        if plugin_dir.join("network.owned").exists() {
            remove_masquerade(&manifest).await;
            remove_network(&self.namespace(&manifest), &manifest.host_interface).await?;
            let _ = fs::remove_file(plugin_dir.join("network.owned")).await;
        }
        let _ = fs::remove_dir_all(Path::new(RUNTIME_ROOT).join(id)).await;
        let _ = fs::remove_file(plugin_dir.join("manifest.json")).await;
        let _ = fs::remove_dir_all(plugin_dir.join("package")).await;
        let _ = fs::remove_file(self.dir.join(format!("{id}.json"))).await;
        Ok(())
    }

    async fn get(&self, id: &str) -> Option<PluginManifest> {
        let manifest = self.manifests.read().await.get(id).cloned()?;
        Some(self.enrich_manifest_ui(manifest))
    }

    async fn start(&self, id: &str) -> Result<(), String> {
        let manifest = self.get(id).await.ok_or("plugin not found")?;
        let _ = fs::write(self.plugin_dir(id).join("service.enabled"), "").await;
        self.user_stopped.lock().await.remove(id);
        self.restart_failures.lock().await.remove(id);
        self.start_service(&manifest).await
    }

    async fn stop(&self, id: &str, force: bool) -> Result<(), String> {
        if self.get(id).await.is_none() {
            return Err("plugin not found".into());
        }
        let _ = fs::remove_file(self.plugin_dir(id).join("service.enabled")).await;
        self.user_stopped.lock().await.insert(id.to_string());
        self.restart_failures.lock().await.remove(id);
        self.stop_service(id, force).await;
        Ok(())
    }

    async fn restart(&self, id: &str) -> Result<(), String> {
        let manifest = self.get(id).await.ok_or("plugin not found")?;
        let _ = fs::write(self.plugin_dir(id).join("service.enabled"), "").await;
        self.user_stopped.lock().await.remove(id);
        self.restart_failures.lock().await.remove(id);
        self.stop_service(id, false).await;
        self.start_service(&manifest).await
    }

    async fn logs(&self, id: &str) -> Result<String, String> {
        if self.get(id).await.is_none() {
            return Err("plugin not found".into());
        }
        let bytes =
            fs::read(self.plugin_dir(id).join("logs/service.log")).await.unwrap_or_default();
        let start = bytes.len().saturating_sub(64 * 1024);
        Ok(String::from_utf8_lossy(&bytes[start..]).into_owned())
    }

    async fn config(&self, id: &str, layer: Option<&str>) -> Result<String, String> {
        let manifest = self.get(id).await.ok_or("plugin not found")?;
        let service = manifest.service.as_ref().ok_or("plugin has no managed service")?;
        match layer.unwrap_or("base") {
            "override" => {
                let p = self.override_config_path(id);
                if p.exists() {
                    fs::read_to_string(p).await.map_err(|e| e.to_string())
                } else {
                    Ok(format!(
                        "# Landscape plugin runtime override\ntproxy-port: {}\nexternal-controller: 0.0.0.0:9090\nexternal-controller-unix: {}\nexternal-ui: \"\"\ndns:\n  enable: true\n  nameserver:\n    - {}\n",
                        manifest.network.tproxy_port,
                        manifest.controller_socket.display(),
                        manifest.network.host_ipv4,
                    ))
                }
            }
            "effective" => {
                self.build_effective_config_with_override(&manifest, None, None).await
            }
            _ => {
                let base_p = self.base_config_path(id, service);
                if base_p.exists() {
                    fs::read_to_string(base_p).await.map_err(|e| e.to_string())
                } else {
                    let bundled_config = self.plugin_dir(id).join("package").join(&service.default_config);
                    fs::read_to_string(bundled_config).await.map_err(|e| e.to_string())
                }
            }
        }
    }

    async fn save_config(
        &self,
        id: &str,
        layer: Option<&str>,
        check: bool,
        body: &str,
    ) -> Result<(), String> {
        if body.len() > 1024 * 1024 {
            return Err("config is too large".into());
        }
        let manifest = self.get(id).await.ok_or("plugin not found")?;
        let service = manifest.service.as_ref().ok_or("plugin has no managed service")?;
        let plugin_dir = self.plugin_dir(id);
        let executable = plugin_dir.join("package").join(&service.executable);
        let data = plugin_dir.join("data");

        let is_override = layer == Some("override");
        let target_path = if is_override {
            self.override_config_path(id)
        } else {
            self.base_config_path(id, service)
        };

        let filename = target_path.file_name().unwrap().to_string_lossy();
        let pending = plugin_dir.join("config").join(format!("{filename}.new"));
        fs::write(&pending, body).await.map_err(|e| e.to_string())?;

        let effective_result = if is_override {
            self.build_effective_config_with_override(&manifest, None, Some(&pending)).await
        } else {
            self.build_effective_config_with_override(&manifest, Some(&pending), None).await
        };

        let effective_content = match effective_result {
            Ok(content) => content,
            Err(err) => {
                let _ = fs::remove_file(&pending).await;
                return Err(err);
            }
        };

        let effective_pending = plugin_dir.join("config").join("effective.new");
        fs::write(&effective_pending, effective_content).await.map_err(|e| e.to_string())?;

        if check {
            if let Err(error) = self.check_service_config(&manifest, &executable, &data, &effective_pending).await {
                let _ = fs::remove_file(&pending).await;
                let _ = fs::remove_file(&effective_pending).await;
                return Err(error);
            }
        }

        let was_running = self.service_running(id).await;
        if was_running {
            self.stop_service(id, false).await;
        }

        fs::rename(&pending, &target_path).await.map_err(|e| e.to_string())?;
        let effective_path = self.effective_config_path(id, service);
        fs::rename(&effective_pending, &effective_path).await.map_err(|e| e.to_string())?;

        if was_running {
            if let Err(err) = self.start_service(&manifest).await {
                tracing::warn!(plugin = %id, %err, "failed to restart service after saving config");
            }
        }
        Ok(())
    }
}

fn validate_package_path(path: &Path) -> Result<(), String> {
    if path.as_os_str().is_empty()
        || path.is_absolute()
        || path.components().any(|part| !matches!(part, Component::Normal(_)))
    {
        return Err("package paths must be relative and may not contain '.' or '..'".into());
    }
    Ok(())
}

fn extract_package(bytes: &[u8], destination: &Path) -> Result<(), String> {
    let decoder = GzDecoder::new(bytes);
    let mut archive = tar::Archive::new(decoder);
    let mut total = 0u64;
    for (index, entry) in archive.entries().map_err(|e| e.to_string())?.enumerate() {
        if index >= MAX_ARCHIVE_ENTRIES {
            return Err("package has too many entries".into());
        }
        let mut entry = entry.map_err(|e| e.to_string())?;
        let kind = entry.header().entry_type();
        if !kind.is_file() && !kind.is_dir() {
            return Err("package may contain only regular files and directories".into());
        }
        total = total.checked_add(entry.size()).ok_or("package expanded size overflow")?;
        if total > MAX_UNPACKED_SIZE {
            return Err("expanded package is too large".into());
        }
        let path = entry.path().map_err(|e| e.to_string())?;
        validate_package_path(&path)?;
        entry.unpack_in(destination).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(unix)]
fn set_executable(path: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    if !path.is_file() {
        return Err("service executable is missing".into());
    }
    stdfs::set_permissions(path, stdfs::Permissions::from_mode(0o755)).map_err(|e| e.to_string())
}

fn valid_network_name(value: &str, max_len: usize) -> bool {
    !value.is_empty()
        && value.len() <= max_len
        && value.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
}

async fn run_ip(args: &[&str]) -> Result<(), String> {
    let output = Command::new("ip").args(args).output().await.map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

async fn run_ip_allow_exists(args: &[&str]) -> Result<(), String> {
    match run_ip(args).await {
        Ok(()) => Ok(()),
        Err(error) if error.to_ascii_lowercase().contains("file exists") => Ok(()),
        Err(error) => Err(error),
    }
}

fn nft_table(manifest: &PluginManifest) -> String {
    format!("landscape_plugin_{}", manifest.id.replace('-', "_"))
}

async fn run_nft(args: &[&str]) -> Result<(), String> {
    let output = Command::new("nft").args(args).output().await.map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

async fn run_iptables(args: &[&str]) -> Result<(), String> {
    let output = Command::new("iptables").args(args).output().await.map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

async fn sync_iptables_forward(manifest: &PluginManifest, enable: bool) {
    let iface = &manifest.host_interface;
    let _ = run_iptables(&["-D", "FORWARD", "-i", iface, "-j", "ACCEPT"]).await;
    let _ = run_iptables(&[
        "-D",
        "FORWARD",
        "-o",
        iface,
        "-m",
        "conntrack",
        "--ctstate",
        "RELATED,ESTABLISHED",
        "-j",
        "ACCEPT",
    ])
    .await;
    let _ = run_iptables(&[
        "-D",
        "FORWARD",
        "-o",
        iface,
        "-m",
        "state",
        "--state",
        "RELATED,ESTABLISHED",
        "-j",
        "ACCEPT",
    ])
    .await;

    if enable {
        let _ = run_iptables(&["-I", "FORWARD", "1", "-i", iface, "-j", "ACCEPT"]).await;
        if run_iptables(&[
            "-I",
            "FORWARD",
            "1",
            "-o",
            iface,
            "-m",
            "conntrack",
            "--ctstate",
            "RELATED,ESTABLISHED",
            "-j",
            "ACCEPT",
        ])
        .await
        .is_err()
        {
            let _ = run_iptables(&[
                "-I",
                "FORWARD",
                "1",
                "-o",
                iface,
                "-m",
                "state",
                "--state",
                "RELATED,ESTABLISHED",
                "-j",
                "ACCEPT",
            ])
            .await;
        }
    }
}

async fn setup_masquerade(manifest: &PluginManifest) -> Result<(), String> {
    if fs::read_to_string("/proc/sys/net/ipv4/ip_forward").await.map_err(|e| e.to_string())?.trim()
        != "1"
    {
        return Err("IPv4 forwarding must be enabled for plugin egress".into());
    }
    let table = nft_table(manifest);
    let _ = run_nft(&["delete", "table", "ip", &table]).await;
    run_nft(&["add", "table", "ip", &table]).await?;
    if let Err(error) = async {
        run_nft(&[
            "add",
            "chain",
            "ip",
            &table,
            "postrouting",
            "{ type nat hook postrouting priority srcnat; policy accept; }",
        ])
        .await?;
        let source = format!("{}/32", manifest.network.peer_ipv4);
        run_nft(&["add", "rule", "ip", &table, "postrouting", "ip", "saddr", &source, "masquerade"])
            .await?;

        run_nft(&[
            "add",
            "chain",
            "ip",
            &table,
            "forward",
            "{ type filter hook forward priority -5; policy accept; }",
        ])
        .await?;
        run_nft(&[
            "add",
            "rule",
            "ip",
            &table,
            "forward",
            "iifname",
            &manifest.host_interface,
            "accept",
        ])
        .await?;
        run_nft(&[
            "add",
            "rule",
            "ip",
            &table,
            "forward",
            "oifname",
            &manifest.host_interface,
            "ct",
            "state",
            "established,related",
            "accept",
        ])
        .await
    }
    .await
    {
        let _ = run_nft(&["delete", "table", "ip", &table]).await;
        return Err(error);
    }

    sync_iptables_forward(manifest, true).await;
    Ok(())
}

async fn remove_masquerade(manifest: &PluginManifest) {
    let table = nft_table(manifest);
    let _ = run_nft(&["delete", "table", "ip", &table]).await;
    sync_iptables_forward(manifest, false).await;
}

async fn netns_exists(namespace: &str) -> Result<bool, String> {
    let output =
        Command::new("ip").args(["netns", "list"]).output().await.map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| line.split_whitespace().next())
        .any(|name| name == namespace))
}

async fn create_veth(manifest: &PluginManifest, namespace: &str) -> Result<(), String> {
    run_ip(&[
        "link",
        "add",
        &manifest.host_interface,
        "type",
        "veth",
        "peer",
        "name",
        &manifest.network.peer_interface,
    ])
    .await?;
    if let Err(error) =
        run_ip(&["link", "set", &manifest.network.peer_interface, "netns", namespace]).await
    {
        let _ = run_ip(&["link", "del", &manifest.host_interface]).await;
        return Err(error);
    }
    Ok(())
}

async fn add_ip_rule(namespace: &str, ipv6: bool, mark: &str, table: &str) -> Result<(), String> {
    let mut args = vec!["netns", "exec", namespace, "ip"];
    if ipv6 {
        args.push("-6");
    }
    args.extend(["rule", "add", "fwmark", mark, "lookup", table]);
    run_ip_allow_exists(&args).await
}

fn deep_merge_yaml(base: &mut serde_yaml::Value, override_val: &serde_yaml::Value) {
    match (base, override_val) {
        (serde_yaml::Value::Mapping(base_map), serde_yaml::Value::Mapping(override_map)) => {
            for (key, val) in override_map {
                if key == &serde_yaml::Value::String("external-ui".into()) {
                    if let serde_yaml::Value::String(s) = val {
                        if s.trim().is_empty() {
                            continue;
                        }
                    } else if val.is_null() {
                        continue;
                    }
                }
                if let Some(base_field) = base_map.get_mut(key) {
                    deep_merge_yaml(base_field, val);
                } else {
                    base_map.insert(key.clone(), val.clone());
                }
            }
        }
        (base, override_val) => {
            *base = override_val.clone();
        }
    }
}

async fn setup_netns_dns(namespace: &str, host_ipv4: &Ipv4Addr) -> Result<(), String> {
    let netns_dir = Path::new("/etc/netns").join(namespace);
    fs::create_dir_all(&netns_dir).await.map_err(|e| e.to_string())?;
    let resolv_conf = netns_dir.join("resolv.conf");
    let content = format!("# Generated by Landscape Plugin System\nnameserver {host_ipv4}\n");
    fs::write(&resolv_conf, content).await.map_err(|e| e.to_string())?;
    Ok(())
}

async fn remove_netns_dns(namespace: &str) {
    let netns_dir = Path::new("/etc/netns").join(namespace);
    let _ = fs::remove_dir_all(&netns_dir).await;
}

async fn remove_network(namespace: &str, host_interface: &str) -> Result<(), String> {
    remove_netns_dns(namespace).await;
    if netns_exists(namespace).await? {
        run_ip(&["netns", "del", namespace]).await
    } else if get_interface_index_by_name(host_interface).is_some() {
        run_ip(&["link", "del", host_interface]).await
    } else {
        Ok(())
    }
}

fn error(status: StatusCode, message: impl Into<String>) -> Response {
    (status, Json(serde_json::json!({ "message": message.into() }))).into_response()
}

#[utoipa::path(
    get,
    path = "/",
    tag = "Plugins",
    responses((status = 200, description = "Installed plugins", body = [PluginInfo]))
)]
async fn list_plugins(State(manager): State<PluginManager>) -> Json<Vec<PluginInfo>> {
    Json(manager.list().await)
}

#[utoipa::path(
    post,
    path = "/import",
    tag = "Plugins",
    responses(
        (status = 200, description = "Imported plugin", body = PluginInfo),
        (status = 400, description = "Invalid plugin manifest"),
        (status = 413, description = "Plugin manifest is too large")
    )
)]
async fn import_plugin(State(manager): State<PluginManager>, mut multipart: Multipart) -> Response {
    let Ok(Some(field)) = multipart.next_field().await else {
        return error(StatusCode::BAD_REQUEST, "plugin manifest is required");
    };
    let Ok(bytes) = field.bytes().await else {
        return error(StatusCode::BAD_REQUEST, "cannot read package");
    };
    if bytes.len() > MAX_PACKAGE_SIZE {
        return error(StatusCode::PAYLOAD_TOO_LARGE, "package is too large");
    }
    match manager.import(&bytes).await {
        Ok(plugin) => Json(plugin).into_response(),
        Err(e) => error(StatusCode::BAD_REQUEST, e),
    }
}

#[utoipa::path(
    delete,
    path = "/{id}",
    tag = "Plugins",
    params(("id" = String, Path, description = "Plugin id")),
    responses(
        (status = 204, description = "Plugin removed"),
        (status = 404, description = "Plugin not found")
    )
)]
async fn remove_plugin(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
) -> Response {
    match manager.remove(&id).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => error(StatusCode::NOT_FOUND, e),
    }
}

#[utoipa::path(
    post,
    path = "/{id}/start",
    tag = "Plugins",
    params(("id" = String, Path, description = "Plugin id")),
    responses(
        (status = 200, description = "Plugin started"),
        (status = 204, description = "Plugin started"),
        (status = 400, description = "Plugin start failed")
    )
)]
async fn start_plugin(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
) -> Response {
    match manager.start(&id).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => error(StatusCode::BAD_REQUEST, e),
    }
}

#[derive(Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct StopQuery {
    #[serde(default)]
    pub force: bool,
}

#[utoipa::path(
    post,
    path = "/{id}/stop",
    tag = "Plugins",
    params(
        ("id" = String, Path, description = "Plugin id"),
        StopQuery
    ),
    responses(
        (status = 200, description = "Plugin stopped"),
        (status = 204, description = "Plugin stopped"),
        (status = 404, description = "Plugin not found")
    )
)]
async fn stop_plugin(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
    Query(query): Query<StopQuery>,
) -> Response {
    match manager.stop(&id, query.force).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => error(StatusCode::NOT_FOUND, e),
    }
}

#[utoipa::path(
    post,
    path = "/{id}/restart",
    tag = "Plugins",
    params(("id" = String, Path, description = "Plugin id")),
    responses(
        (status = 200, description = "Plugin restarted"),
        (status = 204, description = "Plugin restarted"),
        (status = 400, description = "Plugin restart failed"),
        (status = 404, description = "Plugin not found")
    )
)]
async fn restart_plugin(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
) -> Response {
    match manager.restart(&id).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => {
            if e == "plugin not found" {
                error(StatusCode::NOT_FOUND, e)
            } else {
                error(StatusCode::BAD_REQUEST, e)
            }
        }
    }
}

#[utoipa::path(
    get,
    path = "/{id}/logs",
    tag = "Plugins",
    params(("id" = String, Path, description = "Plugin id")),
    responses(
        (status = 200, description = "Plugin logs output", body = String, content_type = "text/plain"),
        (status = 404, description = "Plugin not found")
    )
)]
async fn plugin_logs(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
) -> Response {
    match manager.logs(&id).await {
        Ok(logs) => (StatusCode::OK, logs).into_response(),
        Err(e) => error(StatusCode::NOT_FOUND, e),
    }
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ConfigQuery {
    #[serde(default)]
    pub layer: Option<String>,
    #[serde(default)]
    pub check: Option<bool>,
}

#[utoipa::path(
    get,
    path = "/{id}/config",
    tag = "Plugins",
    params(
        ("id" = String, Path, description = "Plugin id"),
        ConfigQuery
    ),
    responses(
        (status = 200, description = "Plugin configuration content", body = String, content_type = "text/plain"),
        (status = 404, description = "Plugin not found")
    )
)]
async fn plugin_config(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
    Query(query): Query<ConfigQuery>,
) -> Response {
    match manager.config(&id, query.layer.as_deref()).await {
        Ok(config) => (StatusCode::OK, config).into_response(),
        Err(e) => error(StatusCode::NOT_FOUND, e),
    }
}

#[utoipa::path(
    put,
    path = "/{id}/config",
    tag = "Plugins",
    params(
        ("id" = String, Path, description = "Plugin id"),
        ConfigQuery
    ),
    request_body(content = String, description = "Plugin configuration", content_type = "text/plain"),
    responses(
        (status = 200, description = "Plugin configuration saved"),
        (status = 204, description = "Plugin configuration saved"),
        (status = 400, description = "Invalid plugin configuration"),
        (status = 404, description = "Plugin not found")
    )
)]
async fn save_plugin_config(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
    Query(query): Query<ConfigQuery>,
    body: String,
) -> Response {
    let check = query.check.unwrap_or(true);
    match manager.save_config(&id, query.layer.as_deref(), check, &body).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => error(StatusCode::BAD_REQUEST, e),
    }
}

pub(crate) fn is_clash_api_path(path: &str) -> bool {
    let segment = path.trim_start_matches('/').split('/').next().unwrap_or("");
    matches!(
        segment,
        "version"
            | "configs"
            | "proxies"
            | "rules"
            | "connections"
            | "providers"
            | "traffic"
            | "logs"
            | "memory"
            | "dns"
            | "cache"
            | "group"
            | "restart"
            | "upgrade"
            | "profile"
            | "script"
    )
}

pub(crate) fn resolve_ui_target_path(manifest: &PluginManifest, path: &str) -> String {
    let clean = path.trim_start_matches('/');
    let is_mihomo = manifest.service.as_ref().map(|s| s.kind.as_str()) == Some("mihomo")
        || manifest.id == "mihomo";
    if !is_mihomo {
        return if clean.is_empty() {
            manifest.ui_path.clone()
        } else {
            format!("/{clean}")
        };
    }

    if clean.is_empty() || clean == "ui" {
        let p = manifest.ui_path.trim_matches('/');
        if p.is_empty() {
            "/ui/".to_string()
        } else {
            format!("/{p}/")
        }
    } else if is_clash_api_path(clean) {
        format!("/{clean}")
    } else if let Some(stripped) = clean.strip_prefix("ui/") {
        let rest = stripped.trim_start_matches('/');
        let inner = if let Some(s) = rest.strip_prefix("ui/") {
            s.trim_start_matches('/')
        } else {
            rest
        };
        if is_clash_api_path(inner) {
            format!("/{inner}")
        } else if inner.is_empty() {
            let p = manifest.ui_path.trim_matches('/');
            if p.is_empty() {
                "/ui/".to_string()
            } else {
                format!("/{p}/")
            }
        } else if inner == "zashboard" || inner == "dist" || inner == "metacubexd" || inner == "yacd" {
            format!("/ui/{inner}/")
        } else {
            format!("/ui/{inner}")
        }
    } else if clean == "zashboard" || clean == "dist" || clean == "metacubexd" || clean == "yacd" {
        format!("/ui/{clean}/")
    } else {
        format!("/ui/{clean}")
    }
}

async fn plugin_ui_root(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
    request: Request<Body>,
) -> Response {
    let Some(manifest) = manager.get(&id).await else {
        return error(StatusCode::NOT_FOUND, "plugin not found");
    };
    let target_path = resolve_ui_target_path(&manifest, "");
    super::plugin_proxy::proxy_unix(request, &manifest.controller_socket, &target_path).await
}

async fn plugin_ui(
    State(manager): State<PluginManager>,
    AxumPath((id, path)): AxumPath<(String, String)>,
    request: Request<Body>,
) -> Response {
    let Some(manifest) = manager.get(&id).await else {
        return error(StatusCode::NOT_FOUND, "plugin not found");
    };
    let target_path = resolve_ui_target_path(&manifest, &path);
    super::plugin_proxy::proxy_unix(request, &manifest.controller_socket, &target_path).await
}

pub fn api_router(manager: PluginManager) -> Router {
    Router::new()
        .route("/", get(list_plugins))
        .route("/import", post(import_plugin))
        .route("/{id}", delete(remove_plugin))
        .route("/{id}/start", post(start_plugin))
        .route("/{id}/stop", post(stop_plugin))
        .route("/{id}/restart", post(restart_plugin))
        .route("/{id}/logs", get(plugin_logs))
        .route("/{id}/config", get(plugin_config).put(save_plugin_config))
        .layer(DefaultBodyLimit::max(MAX_PACKAGE_SIZE + 1024 * 1024))
        .with_state(manager)
}

#[derive(OpenApi)]
#[openapi(
    paths(
        list_plugins,
        import_plugin,
        remove_plugin,
        start_plugin,
        stop_plugin,
        restart_plugin,
        plugin_logs,
        plugin_config,
        save_plugin_config
    ),
    components(schemas(PluginPlatform, PluginService, PluginNetwork, PluginManifest, PluginInfo)),
    tags((name = "Plugins", description = "Runtime plugin management"))
)]
struct PluginApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    PluginApiDoc::openapi()
}

pub fn ui_router(manager: PluginManager) -> Router {
    Router::new()
        .route("/{id}/ui", any(plugin_ui_root))
        .route("/{id}/ui/", any(plugin_ui_root))
        .route("/{id}/ui/{*path}", any(plugin_ui))
        .with_state(manager)
}

#[cfg(test)]
mod tests {
    use std::{io::Read, path::Path};

    use flate2::{Compression, write::GzEncoder};

    use super::{
        ConfigQuery, PluginManifest, PluginService, StopQuery, extract_package,
        valid_network_name, validate_package_path,
    };

    #[test]
    fn manifest_shape_is_stable() {
        let manifest: PluginManifest = serde_json::from_str(
            r#"{
            "protocol_version": 1,
            "id": "mihomo",
            "name": "Mihomo",
            "host_interface": "land-mihomo",
            "controller_socket": "/run/landscape/plugins/mihomo/controller.sock"
        }"#,
        )
        .unwrap();
        assert_eq!(manifest.ui_path, "/ui/");
        assert_eq!(manifest.id, "mihomo");
        assert_eq!(manifest.network.peer_interface, "plugin0");
        assert_eq!(manifest.network.tproxy_port, 12345);
        assert!(valid_network_name("land-mihomo", 15));
        assert!(!valid_network_name("../../root", 64));
    }

    fn as_str_vec(v: &[String]) -> Vec<&str> {
        v.iter().map(|s| s.as_str()).collect()
    }

    #[test]
    fn service_args_resolution_preset() {
        let mihomo_service = PluginService {
            kind: "mihomo".into(),
            executable: "bin/mihomo".into(),
            default_config: "config/config.yaml".into(),
            run_args: None,
            check_args: None,
            auto_restart: None,
        };
        assert_eq!(mihomo_service.config_filename(), "config.yaml");
        let run = mihomo_service.resolve_run_args(
            Path::new("/bin/mihomo"),
            Path::new("/data"),
            Path::new("/config/config.yaml"),
            "land-mihomo",
        );
        assert_eq!(as_str_vec(&run), vec!["-d", "/data", "-f", "/config/config.yaml"]);

        let check = mihomo_service.resolve_check_args(
            Path::new("/bin/mihomo"),
            Path::new("/data"),
            Path::new("/config/config.yaml"),
            "land-mihomo",
        );
        assert_eq!(
            check.as_ref().map(|v| as_str_vec(v)),
            Some(vec!["-t", "-d", "/data", "-f", "/config/config.yaml"])
        );

        let singbox_service = PluginService {
            kind: "sing-box".into(),
            executable: "bin/sing-box".into(),
            default_config: "config.json".into(),
            run_args: None,
            check_args: None,
            auto_restart: Some(true),
        };
        assert_eq!(singbox_service.config_filename(), "config.json");
        let sb_run = singbox_service.resolve_run_args(
            Path::new("/bin/sing-box"),
            Path::new("/data"),
            Path::new("/config/config.json"),
            "land-sb",
        );
        assert_eq!(as_str_vec(&sb_run), vec!["run", "-c", "/config/config.json", "-D", "/data"]);
        let sb_check = singbox_service.resolve_check_args(
            Path::new("/bin/sing-box"),
            Path::new("/data"),
            Path::new("/config/config.json"),
            "land-sb",
        );
        assert_eq!(
            sb_check.as_ref().map(|v| as_str_vec(v)),
            Some(vec!["check", "-c", "/config/config.json", "-D", "/data"])
        );
    }

    #[test]
    fn service_args_resolution_custom_placeholders() {
        let custom_service = PluginService {
            kind: "custom-vpn".into(),
            executable: "bin/vpn".into(),
            default_config: "vpn.conf".into(),
            run_args: Some(vec![
                "start".into(),
                "--cfg={config}".into(),
                "--dir={data}".into(),
                "--ns={namespace}".into(),
            ]),
            check_args: Some(vec!["verify".into(), "{config}".into()]),
            auto_restart: Some(false),
        };
        assert_eq!(custom_service.config_filename(), "vpn.conf");
        let run = custom_service.resolve_run_args(
            Path::new("/bin/vpn"),
            Path::new("/data/vpn"),
            Path::new("/cfg/vpn.conf"),
            "land-vpn",
        );
        assert_eq!(
            as_str_vec(&run),
            vec![
                "start",
                "--cfg=/cfg/vpn.conf",
                "--dir=/data/vpn",
                "--ns=land-vpn"
            ]
        );
        let check = custom_service.resolve_check_args(
            Path::new("/bin/vpn"),
            Path::new("/data/vpn"),
            Path::new("/cfg/vpn.conf"),
            "land-vpn",
        );
        assert_eq!(
            check.as_ref().map(|v| as_str_vec(v)),
            Some(vec!["verify", "/cfg/vpn.conf"])
        );
    }

    #[test]
    fn stop_query_deserialization() {
        let q_default: StopQuery = serde_json::from_str("{}").unwrap();
        assert!(!q_default.force);

        let q_force: StopQuery = serde_json::from_str(r#"{"force": true}"#).unwrap();
        assert!(q_force.force);
    }

    #[test]
    fn config_query_deserialization() {
        let q_empty: ConfigQuery = serde_json::from_str("{}").unwrap();
        assert_eq!(q_empty.layer, None);
        assert_eq!(q_empty.check, None);

        let q_layer: ConfigQuery =
            serde_json::from_str(r#"{"layer": "override", "check": false}"#).unwrap();
        assert_eq!(q_layer.layer.as_deref(), Some("override"));
        assert_eq!(q_layer.check, Some(false));
    }

    #[test]
    fn deep_merge_yaml_works() {
        let base_yaml = r#"
port: 7890
mode: rule
external-ui: ui
dns:
  enable: true
  nameserver:
    - 1.1.1.1
proxies:
  - name: p1
    type: ss
"#;
        let override_yaml = r#"
mode: global
external-ui: ""
dns:
  nameserver:
    - 100.64.127.1
  enhanced-mode: fake-ip
tproxy-port: 12345
"#;
        let mut base_val: serde_yaml::Value = serde_yaml::from_str(base_yaml).unwrap();
        let override_val: serde_yaml::Value = serde_yaml::from_str(override_yaml).unwrap();
        super::deep_merge_yaml(&mut base_val, &override_val);

        assert_eq!(base_val["port"].as_i64(), Some(7890));
        assert_eq!(base_val["mode"].as_str(), Some("global"));
        assert_eq!(base_val["external-ui"].as_str(), Some("ui"));
        assert_eq!(base_val["tproxy-port"].as_i64(), Some(12345));
        assert_eq!(base_val["dns"]["enable"].as_bool(), Some(true));
        assert_eq!(base_val["dns"]["enhanced-mode"].as_str(), Some("fake-ip"));
        assert_eq!(base_val["dns"]["nameserver"][0].as_str(), Some("100.64.127.1"));
        assert_eq!(base_val["proxies"][0]["name"].as_str(), Some("p1"));
    }

    #[test]
    fn package_extraction_rejects_unsafe_paths() {
        assert!(validate_package_path(std::path::Path::new("bin/mihomo")).is_ok());
        assert!(validate_package_path(std::path::Path::new("../mihomo")).is_err());

        let mut gzip = GzEncoder::new(Vec::new(), Compression::fast());
        {
            let mut archive = tar::Builder::new(&mut gzip);
            let body = br#"{"protocol_version":1}"#;
            let mut header = tar::Header::new_gnu();
            header.set_size(body.len() as u64);
            header.set_mode(0o644);
            header.set_cksum();
            archive.append_data(&mut header, "manifest.json", &body[..]).unwrap();
            archive.finish().unwrap();
        }
        let bytes = gzip.finish().unwrap();
        let output = tempfile::tempdir().unwrap();
        extract_package(&bytes, output.path()).unwrap();
        let mut manifest = String::new();
        std::fs::File::open(output.path().join("manifest.json"))
            .unwrap()
            .read_to_string(&mut manifest)
            .unwrap();
        assert!(manifest.contains("protocol_version"));
    }

    #[test]
    fn clash_api_path_matching() {
        assert!(super::is_clash_api_path("version"));
        assert!(super::is_clash_api_path("/version"));
        assert!(super::is_clash_api_path("configs"));
        assert!(super::is_clash_api_path("proxies"));
        assert!(super::is_clash_api_path("proxies/GLOBAL"));
        assert!(super::is_clash_api_path("rules"));
        assert!(super::is_clash_api_path("connections"));
        assert!(super::is_clash_api_path("providers/proxies"));
        assert!(super::is_clash_api_path("traffic"));
        assert!(super::is_clash_api_path("logs"));
        assert!(super::is_clash_api_path("memory"));
        assert!(super::is_clash_api_path("dns/query"));
        assert!(super::is_clash_api_path("cache/fakeip/flush"));
        assert!(super::is_clash_api_path("group/GLOBAL/delay"));
        assert!(super::is_clash_api_path("restart"));
        assert!(super::is_clash_api_path("upgrade"));

        assert!(!super::is_clash_api_path("zashboard"));
        assert!(!super::is_clash_api_path("zashboard/"));
        assert!(!super::is_clash_api_path("zashboard/assets/index.js"));
        assert!(!super::is_clash_api_path("assets/index.js"));
        assert!(!super::is_clash_api_path("index.html"));
        assert!(!super::is_clash_api_path("favicon.ico"));
    }

    #[test]
    fn ui_target_path_resolution() {
        let manifest: PluginManifest = serde_json::from_str(
            r#"{
            "protocol_version": 1,
            "id": "mihomo",
            "name": "Mihomo",
            "host_interface": "land-mihomo",
            "controller_socket": "/run/landscape/plugins/mihomo/controller.sock",
            "ui_path": "/ui/zashboard/",
            "service": {
                "kind": "mihomo",
                "executable": "bin/mihomo",
                "default_config": "config.yaml"
            }
        }"#,
        )
        .unwrap();

        // Root UI requests
        assert_eq!(super::resolve_ui_target_path(&manifest, ""), "/ui/zashboard/");
        assert_eq!(super::resolve_ui_target_path(&manifest, "/"), "/ui/zashboard/");
        assert_eq!(super::resolve_ui_target_path(&manifest, "ui"), "/ui/zashboard/");
        assert_eq!(super::resolve_ui_target_path(&manifest, "ui/"), "/ui/zashboard/");
        assert_eq!(super::resolve_ui_target_path(&manifest, "/ui/"), "/ui/zashboard/");

        // Single clean ui path to zashboard
        assert_eq!(super::resolve_ui_target_path(&manifest, "zashboard"), "/ui/zashboard/");
        assert_eq!(super::resolve_ui_target_path(&manifest, "zashboard/"), "/ui/zashboard/");
        assert_eq!(super::resolve_ui_target_path(&manifest, "/zashboard/"), "/ui/zashboard/");
        assert_eq!(super::resolve_ui_target_path(&manifest, "zashboard/assets/index.js"), "/ui/zashboard/assets/index.js");

        // Old duplicate ui/ui/ path handling
        assert_eq!(super::resolve_ui_target_path(&manifest, "ui/zashboard/"), "/ui/zashboard/");
        assert_eq!(super::resolve_ui_target_path(&manifest, "ui/ui/zashboard/"), "/ui/zashboard/");

        // Clash API requests
        assert_eq!(super::resolve_ui_target_path(&manifest, "version"), "/version");
        assert_eq!(super::resolve_ui_target_path(&manifest, "proxies"), "/proxies");
        assert_eq!(super::resolve_ui_target_path(&manifest, "configs"), "/configs");
        assert_eq!(super::resolve_ui_target_path(&manifest, "traffic"), "/traffic");
    }
}
