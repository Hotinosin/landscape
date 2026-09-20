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
    extract::{Multipart, Path as AxumPath, State},
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
    Ipv4Addr::new(169, 254, 127, 1)
}

const fn default_peer_ipv4() -> Ipv4Addr {
    Ipv4Addr::new(169, 254, 127, 2)
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
        };
        fs::create_dir_all(&manager.dir).await.map_err(|e| e.to_string())?;
        manager.reload().await;
        Ok(manager)
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
            let Ok(bytes) = fs::read(path).await else { continue };
            let Ok(manifest) = serde_json::from_slice::<PluginManifest>(&bytes) else { continue };
            if self.validate(&manifest).is_ok() {
                if let Err(error) = self.install(&manifest).await {
                    tracing::warn!(plugin = %manifest.id, %error, "failed to restore plugin runtime");
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
            if service.kind != "mihomo" {
                return Err("only the declarative mihomo service is supported".into());
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

    async fn install(&self, manifest: &PluginManifest) -> Result<(), String> {
        self.prepare_dirs(manifest).await?;
        self.setup_network(manifest).await?;
        self.start_tproxy(manifest).await?;
        self.start_service(manifest).await?;
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
        let config = plugin_dir.join("config/config.yaml");
        if !executable.is_file() || !bundled_config.is_file() {
            return Err("package executable or default config is missing".into());
        }
        if !config.exists() {
            fs::copy(&bundled_config, &config).await.map_err(|e| e.to_string())?;
        }
        let namespace = self.namespace(manifest);
        let data = plugin_dir.join("data");
        self.check_service_config(manifest, &executable, &data, &config).await?;
        let log = OpenOptions::new()
            .create(true)
            .append(true)
            .open(plugin_dir.join("logs/service.log"))
            .map_err(|e| e.to_string())?;
        let mut child = Command::new("ip")
            .args(["netns", "exec", &namespace])
            .arg(executable)
            .arg("-d")
            .arg(data)
            .arg("-f")
            .arg(config)
            .stdin(Stdio::null())
            .stdout(Stdio::from(log.try_clone().map_err(|e| e.to_string())?))
            .stderr(Stdio::from(log))
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| e.to_string())?;
        tokio::time::sleep(tokio::time::Duration::from_millis(250)).await;
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            return Err(format!("mihomo exited with {status}"));
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
        let namespace = self.namespace(manifest);
        let check = Command::new("ip")
            .args(["netns", "exec", &namespace])
            .arg(executable)
            .args(["-t", "-d"])
            .arg(data)
            .arg("-f")
            .arg(config)
            .output()
            .await
            .map_err(|e| e.to_string())?;
        if !check.status.success() {
            return Err(format!(
                "mihomo config check failed: {}",
                String::from_utf8_lossy(&check.stderr).trim()
            ));
        }
        Ok(())
    }

    async fn stop_service(&self, id: &str) {
        if let Some(mut child) = self.services.lock().await.remove(id) {
            let _ = child.kill().await;
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
            setup_masquerade(manifest).await?;
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
            self.stop_service(&manifest.id).await;
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
        self.register(&manifest).await;
        self.manifests.write().await.insert(manifest.id.clone(), manifest.clone());
        Ok(PluginInfo {
            interface_ready: get_interface_index_by_name(&manifest.host_interface).is_some(),
            tproxy_ready: self.tproxy_ready(&manifest.id).await,
            controller_ready: manifest.controller_socket.exists(),
            service_running: self.service_running(&manifest.id).await,
            trust: "UNVERIFIED_SOURCE",
            manifest,
        })
    }

    async fn remove(&self, id: &str) -> Result<(), String> {
        let manifest = self.manifests.write().await.remove(id).ok_or("plugin not found")?;
        self.stop_service(id).await;
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
        self.manifests.read().await.get(id).cloned()
    }

    async fn start(&self, id: &str) -> Result<(), String> {
        let manifest = self.get(id).await.ok_or("plugin not found")?;
        self.start_service(&manifest).await
    }

    async fn stop(&self, id: &str) -> Result<(), String> {
        if self.get(id).await.is_none() {
            return Err("plugin not found".into());
        }
        self.stop_service(id).await;
        Ok(())
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

    async fn config(&self, id: &str) -> Result<String, String> {
        if self.get(id).await.is_none() {
            return Err("plugin not found".into());
        }
        fs::read_to_string(self.plugin_dir(id).join("config/config.yaml"))
            .await
            .map_err(|e| e.to_string())
    }

    async fn save_config(&self, id: &str, body: &str) -> Result<(), String> {
        if body.len() > 1024 * 1024 {
            return Err("config is too large".into());
        }
        let manifest = self.get(id).await.ok_or("plugin not found")?;
        let service = manifest.service.as_ref().ok_or("plugin has no managed service")?;
        let plugin_dir = self.plugin_dir(id);
        let executable = plugin_dir.join("package").join(&service.executable);
        let data = plugin_dir.join("data");
        let config = plugin_dir.join("config/config.yaml");
        let pending = plugin_dir.join("config/config.yaml.new");
        fs::write(&pending, body).await.map_err(|e| e.to_string())?;
        if let Err(error) = self.check_service_config(&manifest, &executable, &data, &pending).await
        {
            let _ = fs::remove_file(&pending).await;
            return Err(error);
        }
        let was_running = self.service_running(id).await;
        if was_running {
            self.stop_service(id).await;
        }
        fs::rename(&pending, config).await.map_err(|e| e.to_string())?;
        if was_running {
            self.start_service(&manifest).await?;
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
            .await
    }
    .await
    {
        let _ = run_nft(&["delete", "table", "ip", &table]).await;
        return Err(error);
    }
    Ok(())
}

async fn remove_masquerade(manifest: &PluginManifest) {
    let table = nft_table(manifest);
    let _ = run_nft(&["delete", "table", "ip", &table]).await;
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

async fn remove_network(namespace: &str, host_interface: &str) -> Result<(), String> {
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

async fn start_plugin(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
) -> Response {
    match manager.start(&id).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => error(StatusCode::BAD_REQUEST, e),
    }
}

async fn stop_plugin(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
) -> Response {
    match manager.stop(&id).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => error(StatusCode::NOT_FOUND, e),
    }
}

async fn plugin_logs(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
) -> Response {
    match manager.logs(&id).await {
        Ok(logs) => (StatusCode::OK, logs).into_response(),
        Err(e) => error(StatusCode::NOT_FOUND, e),
    }
}

async fn plugin_config(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
) -> Response {
    match manager.config(&id).await {
        Ok(config) => (StatusCode::OK, config).into_response(),
        Err(e) => error(StatusCode::NOT_FOUND, e),
    }
}

async fn save_plugin_config(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
    body: String,
) -> Response {
    match manager.save_config(&id, &body).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => error(StatusCode::BAD_REQUEST, e),
    }
}

async fn plugin_ui(
    State(manager): State<PluginManager>,
    AxumPath((id, path)): AxumPath<(String, String)>,
    request: Request<Body>,
) -> Response {
    let Some(manifest) = manager.get(&id).await else {
        return error(StatusCode::NOT_FOUND, "plugin not found");
    };
    super::plugin_proxy::proxy_unix(request, &manifest.controller_socket, &format!("/{path}")).await
}

pub fn api_router(manager: PluginManager) -> Router {
    Router::new()
        .route("/", get(list_plugins))
        .route("/import", post(import_plugin))
        .route("/{id}", delete(remove_plugin))
        .route("/{id}/start", post(start_plugin))
        .route("/{id}/stop", post(stop_plugin))
        .route("/{id}/logs", get(plugin_logs))
        .route("/{id}/config", get(plugin_config).put(save_plugin_config))
        .layer(DefaultBodyLimit::max(MAX_PACKAGE_SIZE + 1024 * 1024))
        .with_state(manager)
}

#[derive(OpenApi)]
#[openapi(
    paths(list_plugins, import_plugin, remove_plugin),
    components(schemas(PluginPlatform, PluginService, PluginNetwork, PluginManifest, PluginInfo)),
    tags((name = "Plugins", description = "Runtime plugin management"))
)]
struct PluginApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    PluginApiDoc::openapi()
}

pub fn ui_router(manager: PluginManager) -> Router {
    Router::new().route("/{id}/ui/{*path}", any(plugin_ui)).with_state(manager)
}

#[cfg(test)]
mod tests {
    use std::io::Read;

    use flate2::{Compression, write::GzEncoder};

    use super::{PluginManifest, extract_package, valid_network_name, validate_package_path};

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
}
