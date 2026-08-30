# Landscape network plugins

Network plugins are external processes that expose a veth data plane and an optional Unix-socket control plane. Landscape does not execute imported files.

## Manifest v1

```json
{
  "protocol_version": 1,
  "id": "mihomo",
  "name": "Mihomo",
  "host_interface": "land-mihomo",
  "controller_socket": "/run/landscape/plugins/mihomo/controller.sock",
  "ui_path": "/ui/"
}
```

Before importing the manifest, the plugin must create its netns and veth, leave `host_interface` in Landscape's namespace, start its TProxy listener, and start Mihomo's `external-controller-unix` at `controller_socket`.

The controller socket should be below `/run/landscape/plugins/<id>/`. Landscape serves it only through its authenticated WebUI; no controller TCP port is required.
