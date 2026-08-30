use std::{
    collections::HashMap,
    path::{Component, Path, PathBuf},
    sync::Arc,
};

use axum::{
    Json, Router,
    body::Body,
    extract::{Multipart, Path as AxumPath, State},
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
    routing::{any, delete, get, post},
};
use landscape::sys_service::route::IpRouteService;
use landscape_common::{
    dev::get_interface_index_by_name, sys_service::route_service::RouteTargetInfo,
};
use serde::{Deserialize, Serialize};
use tokio::{fs, sync::RwLock};

const MAX_MANIFEST_SIZE: usize = 64 * 1024;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PluginManifest {
    pub protocol_version: u16,
    pub id: String,
    pub name: String,
    pub host_interface: String,
    pub controller_socket: PathBuf,
    #[serde(default = "default_ui_path")]
    pub ui_path: String,
}

fn default_ui_path() -> String {
    "/ui/".into()
}

#[derive(Clone, Debug, Serialize)]
pub struct PluginInfo {
    #[serde(flatten)]
    pub manifest: PluginManifest,
    pub interface_ready: bool,
    pub controller_ready: bool,
}

#[derive(Clone)]
pub struct PluginManager {
    dir: PathBuf,
    route_service: IpRouteService,
    manifests: Arc<RwLock<HashMap<String, PluginManifest>>>,
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
        };
        fs::create_dir_all(&manager.dir).await.map_err(|e| e.to_string())?;
        manager.reload().await;
        Ok(manager)
    }

    async fn reload(&self) {
        let Ok(mut entries) = fs::read_dir(&self.dir).await else { return };
        while let Ok(Some(entry)) = entries.next_entry().await {
            if entry.path().extension().and_then(|v| v.to_str()) != Some("json") {
                continue;
            }
            let Ok(bytes) = fs::read(entry.path()).await else { continue };
            let Ok(manifest) = serde_json::from_slice::<PluginManifest>(&bytes) else { continue };
            if self.validate(&manifest).is_ok() {
                self.register(&manifest).await;
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
        let socket_root = Path::new("/run/landscape/plugins").join(&manifest.id);
        if !manifest.controller_socket.starts_with(socket_root) {
            return Err("controller_socket must be inside /run/landscape/plugins/<id>".into());
        }
        if !manifest.ui_path.starts_with('/') {
            return Err("ui_path must start with '/'".into());
        }
        Ok(())
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
                self.register(manifest).await;
            } else {
                let route_key = Self::route_key(&manifest.id);
                self.route_service.remove_ipv4_wan_route(&route_key).await;
                self.route_service.remove_ipv6_wan_route(&route_key).await;
            }
        }
        manifests
            .into_iter()
            .map(|manifest| PluginInfo {
                interface_ready: get_interface_index_by_name(&manifest.host_interface).is_some(),
                controller_ready: manifest.controller_socket.exists(),
                manifest,
            })
            .collect()
    }

    async fn import(&self, bytes: &[u8]) -> Result<PluginInfo, String> {
        let manifest: PluginManifest = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
        self.validate(&manifest)?;
        let path = self.dir.join(format!("{}.json", manifest.id));
        let encoded = serde_json::to_vec_pretty(&manifest).map_err(|e| e.to_string())?;
        fs::write(path, encoded).await.map_err(|e| e.to_string())?;
        self.register(&manifest).await;
        self.manifests.write().await.insert(manifest.id.clone(), manifest.clone());
        Ok(PluginInfo {
            interface_ready: get_interface_index_by_name(&manifest.host_interface).is_some(),
            controller_ready: manifest.controller_socket.exists(),
            manifest,
        })
    }

    async fn remove(&self, id: &str) -> Result<(), String> {
        self.manifests.write().await.remove(id).ok_or("plugin not found")?;
        let route_key = Self::route_key(id);
        self.route_service.remove_ipv4_wan_route(&route_key).await;
        self.route_service.remove_ipv6_wan_route(&route_key).await;
        match fs::remove_file(self.dir.join(format!("{id}.json"))).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }

    async fn get(&self, id: &str) -> Option<PluginManifest> {
        self.manifests.read().await.get(id).cloned()
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
    use super::PluginManifest;

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
    }
}
