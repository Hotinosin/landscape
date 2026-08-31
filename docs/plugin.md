# Landscape network plugins

Network plugins are external processes with a managed veth data plane and an optional Unix-socket control plane. Landscape never executes the uploaded JSON or an executable path supplied by it.

## Manifest v1

```json
{
  "protocol_version": 1,
  "id": "mihomo",
  "name": "Mihomo",
  "host_interface": "land-mihomo",
  "controller_socket": "/run/landscape/plugins/mihomo/controller.sock",
  "ui_path": "/ui/",
  "network": {
    "namespace": "land-mihomo",
    "peer_interface": "plugin0",
    "tproxy_port": 12345
  }
}
```

Importing the manifest creates `<LANDSCAPE_CONF_PATH>/plugins/<id>/{config,data,logs,ui}`, `/run/landscape/plugins/<id>`, the network namespace and veth pair. Landscape starts its bundled `redirect_pkg_handler` in that namespace and configures IPv4 plus best-effort IPv6 TProxy policy routing. Keep `redirect_pkg_handler` beside `landscape-webserver`.

The plugin process itself is still external. Start Mihomo in the generated namespace with its TProxy listener on `network.tproxy_port`, use the generated plugin directory as its working directory, and set `external-controller-unix` to `controller_socket`.

Deleting a plugin stops the TProxy handler and removes Landscape-owned network/runtime state. Persistent plugin data remains in `<LANDSCAPE_CONF_PATH>/plugins/<id>`; only its manifest is removed.

The controller socket should be below `/run/landscape/plugins/<id>/`. Landscape serves it only through its authenticated WebUI; no controller TCP port is required.
