use std::{
    collections::HashMap,
    fs::OpenOptions,
    path::{Component, Path, PathBuf},
    process::Stdio,
    sync::Arc,
};

use axum::{
    body::Body,
    extract::{Multipart, Path as AxumPath, State},
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
    routing::{any, delete, get, post},
    Json, Router,
};
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

const MAX_MANIFEST_SIZE: usize = 64 * 1024;
const RUNTIME_ROOT: &str = "/run/landscape/plugins";

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PluginNetwork {
    #[serde(default)]
    pub namespace: Option<String>,
    #[serde(default = "default_peer_interface")]
    pub peer_interface: String,
    #[serde(default = "default_tproxy_port")]
    pub tproxy_port: u16,
}

impl Default for PluginNetwork {
    fn default() -> Self {
        Self {
            namespace: None,
            peer_interface: default_peer_interface(),
            tproxy_port: default_tproxy_port(),
        }
    }
}

fn default_peer_interface() -> String {
    "plugin0".into()
}

const fn default_tproxy_port() -> u16 {
    12345
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PluginManifest {
    pub protocol_version: u16,
    pub id: String,
    pub name: String,
    pub host_interface: String,
    pub controller_socket: PathBuf,
    #[serde(default = "default_ui_path")]
    pub ui_path: String,
    #[serde(default)]
    pub network: PluginNetwork,
}

fn default_ui_path() -> String {
    "/ui/".into()
}

#[derive(Clone, Debug, Serialize)]
pub struct PluginInfo {
    #[serde(flatten)]
    pub manifest: PluginManifest,
    pub interface_ready: bool,
    pub tproxy_ready: bool,
    pub controller_ready: bool,
}

#[derive(Clone)]
pub struct PluginManager {
    dir: PathBuf,
    route_service: IpRouteService,
    manifests: Arc<RwLock<HashMap<String, PluginManifest>>>,
    handlers: Arc<Mutex<HashMap<String, Child>>>,
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
        self.register(manifest).await;
        Ok(())
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
                manifest,
            });
        }
        result
    }

    async fn import(&self, bytes: &[u8]) -> Result<PluginInfo, String> {
        let manifest: PluginManifest = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
        self.validate(&manifest)?;
        self.install(&manifest).await?;
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
            manifest,
        })
    }

    async fn remove(&self, id: &str) -> Result<(), String> {
        let manifest = self.manifests.write().await.remove(id).ok_or("plugin not found")?;
        self.stop_tproxy(id).await;
        let route_key = Self::route_key(id);
        self.route_service.remove_ipv4_wan_route(&route_key).await;
        self.route_service.remove_ipv6_wan_route(&route_key).await;
        let plugin_dir = self.plugin_dir(id);
        if plugin_dir.join("network.owned").exists() {
            remove_network(&self.namespace(&manifest), &manifest.host_interface).await?;
            let _ = fs::remove_file(plugin_dir.join("network.owned")).await;
        }
        let _ = fs::remove_dir_all(Path::new(RUNTIME_ROOT).join(id)).await;
        let _ = fs::remove_file(plugin_dir.join("manifest.json")).await;
        let _ = fs::remove_file(self.dir.join(format!("{id}.json"))).await;
        Ok(())
    }

    async fn get(&self, id: &str) -> Option<PluginManifest> {
        self.manifests.read().await.get(id).cloned()
    }
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

async fn list_plugins(State(manager): State<PluginManager>) -> Json<Vec<PluginInfo>> {
    Json(manager.list().await)
}

async fn import_plugin(State(manager): State<PluginManager>, mut multipart: Multipart) -> Response {
    let Ok(Some(field)) = multipart.next_field().await else {
        return error(StatusCode::BAD_REQUEST, "plugin manifest is required");
    };
    let Ok(bytes) = field.bytes().await else {
        return error(StatusCode::BAD_REQUEST, "cannot read manifest");
    };
    if bytes.len() > MAX_MANIFEST_SIZE {
        return error(StatusCode::PAYLOAD_TOO_LARGE, "manifest is too large");
    }
    match manager.import(&bytes).await {
        Ok(plugin) => Json(plugin).into_response(),
        Err(e) => error(StatusCode::BAD_REQUEST, e),
    }
}

async fn remove_plugin(
    State(manager): State<PluginManager>,
    AxumPath(id): AxumPath<String>,
) -> Response {
    match manager.remove(&id).await {
        Ok(()) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => error(StatusCode::NOT_FOUND, e),
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
        .with_state(manager)
}

pub fn ui_router(manager: PluginManager) -> Router {
    Router::new().route("/{id}/ui/{*path}", any(plugin_ui)).with_state(manager)
}

#[cfg(test)]
mod tests {
    use super::{valid_network_name, PluginManifest};

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
}
