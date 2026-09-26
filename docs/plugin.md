# Landscape network plugins

Network plugins use a standard `.tar.gz` package with a declarative manifest. Built-in launch and validation templates are available for `mihomo`, `sing-box`, `xray`, and `v2ray`. Other service kinds can provide declarative `run_args` and `check_args`; packages cannot execute shell scripts during installation.

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
  "ui_path": "/ui/zashboard/",
  "network": {
    "namespace": "land-mihomo",
    "peer_interface": "plugin0",
    "tproxy_port": 12345,
    "host_ipv4": "100.64.127.1",
    "peer_ipv4": "100.64.127.2"
  },
  "service": {
    "kind": "mihomo",
    "executable": "bin/mihomo",
    "default_config": "config.yaml",
    "auto_restart": true
  }
}
```

Build an installable package with `sh examples/build-mihomo-plugin.sh /path/to/mihomo VERSION mihomo.tar.gz`. The archive contains `manifest.json`, `config.yaml`, and `bin/mihomo`.

Importing the package safely extracts regular files only, validates the target platform, copies the default config only when no instance config exists, and creates the managed network namespace plus the bundled `redirect_pkg_handler`. The managed service remains stopped until the user starts it. Starting and stopping the service also creates and removes its nftables/iptables forwarding and masquerade rules. IPv4 forwarding must already be enabled on the router. Packages are unsigned in phase 1 and are shown as `UNVERIFIED_SOURCE`.

Configuration is split into user (`base`), Landscape-managed (`override`), and merged (`effective`) layers. Saving a writable layer validates the resulting configuration by default; callers may explicitly disable that check. Enabled state is persisted, and enabled services are restarted after an unexpected exit unless `auto_restart` is `false`.

Deleting a plugin stops its managed service and TProxy handler, removes the package and Landscape-owned network/runtime state, and preserves `config`, `data`, and `logs`.

The controller socket should be below `/run/landscape/plugins/<id>/`. Landscape serves it only through its authenticated WebUI; no controller TCP port is required.
