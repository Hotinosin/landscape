# Landscape network plugins

Network plugins use a standard `.tar.gz` package with a declarative manifest. Phase 1 supports the `mihomo` service kind only; packages cannot declare scripts or arbitrary command arguments.

## Manifest v1

```json
{
  "protocol_version": 1,
  "id": "mihomo",
  "name": "Mihomo",
  "version": "1.19.31",
  "platform": { "os": "linux", "arch": "aarch64" },
  "host_interface": "land-mihomo",
  "controller_socket": "/run/landscape/plugins/mihomo/controller.sock",
  "ui_path": "/ui/",
  "network": {
    "namespace": "land-mihomo",
    "peer_interface": "plugin0",
    "tproxy_port": 12345,
    "host_ipv4": "169.254.127.1",
    "peer_ipv4": "169.254.127.2"
  },
  "service": {
    "kind": "mihomo",
    "executable": "bin/mihomo",
    "default_config": "config.yaml"
  }
}
```

Build an installable package with `sh examples/build-mihomo-plugin.sh /path/to/mihomo VERSION mihomo.tar.gz`. The archive contains `manifest.json`, `config.yaml`, and `bin/mihomo`.

Importing the package safely extracts regular files only, validates the Linux platform, copies the default config only when no instance config exists, creates the managed network namespace and its isolated nftables masquerade table, checks the config, and starts Mihomo plus the bundled `redirect_pkg_handler`. IPv4 forwarding must already be enabled on the router. Packages are unsigned in phase 1 and are shown as `UNVERIFIED_SOURCE`.

Deleting a plugin stops Mihomo and the TProxy handler, removes the package and Landscape-owned network/runtime state, and preserves `config`, `data`, and `logs`.

The controller socket should be below `/run/landscape/plugins/<id>/`. Landscape serves it only through its authenticated WebUI; no controller TCP port is required.
