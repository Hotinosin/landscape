# Landscape 插件包开发与打包制作指南

本文档为开发与制作 Landscape 网络插件（Network Plugin）的官方指南。Landscape 插件体系基于 Linux 网络命名空间（Network Namespace）与 eBPF TC 流量重定向技术，为第三方代理核心（如 Mihomo）提供安全隔离、高效透明代理（TProxy）与统一的 Web 控制面板集成。

---

## 1. 插件架构概览

Landscape 插件以标准的 `.tar.gz`（或 `.tgz`）压缩包形式进行分发与安装。系统在导入插件包时，将自动完成以下生命周期管理：

1. **命名空间与网络隔离**：为插件创建独立的 NetNS（如 `land-mihomo`），并通过一对 veth 虚拟接口（如宿主机端 `land-mihomo` 与插件端 `plugin0`）互联。
2. **地址分配与出站伪装**：采用 RFC 6598 规定的运营商级 CGNAT 网段（默认 `100.64.127.1/30`），避免与局域网 IP 冲突；系统自动配置 nftables 独立伪装表与 iptables `FORWARD` 放行规则，保障容器/插件出站网络通畅。
3. **流量拦截与转发模块**：宿主机自动拉起伴随插件的 `redirect_pkg_handler`（基于 eBPF TC 的转发模块），将入站流量精准重定向至插件内部的透明代理端口（如 `12345`）。
4. **控制面与控制台代理**：通过 Unix Domain Socket 挂载，将插件内部的 RESTful API 及 Web UI（如 Zashboard）反向代理至 Landscape 主路由系统的 `/api/plugins/{id}/ui/`，无需暴露非安全的公网控制端口。

---

## 2. 插件包目录规范

插件包必须为标准 `tar.gz`（推荐使用 POSIX ustar 格式），解压根目录下必须包含：

```text
my-plugin.tar.gz
├── manifest.json       # [必须] 插件元数据与运行配置清单
├── config.yaml         # [必须] 默认基础配置文件（或 manifest 中指定的 default_config）
├── bin/                # [建议] 二进制可执行文件目录
│   └── mihomo          # 核心可执行二进制程序
└── ui/                 # [可选] 预置的前端控制面板静态资源（亦可在运行期动态下载）
```

> [!IMPORTANT]
> **安全限制**：
> - 压缩包解压后的总文件大小上限为 **512 MB**，单个压缩包上限为 **128 MB**；
> - 文件项上限为 **4096**；
> - 严禁包含绝对路径、父级路径穿越（`../`）、符号链接（Symlink）或硬链接。

---

## 3. `manifest.json` 规范定义

`manifest.json` 是插件包的核心配置文件，描述了插件的平台、接口、服务与网络参数。

### 示例配置

```json
{
  "protocol_version": 1,
  "id": "mihomo",
  "name": "Mihomo",
  "version": "1.19.31",
  "platform": {
    "os": "linux",
    "arch": "aarch64"
  },
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

### 字段说明表

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `protocol_version` | integer | 是 | `1` | 插件协议版本，目前固定为 `1`。 |
| `id` | string | 是 | - | 插件唯一英文字符串标识，仅限字母、数字、下划线及横线。 |
| `name` | string | 是 | - | 插件在 WebUI 页面显示的展示名称。 |
| `version` | string | 是 | - | 插件版本号（如 `1.19.31`）。 |
| `platform.os` | string | 是 | - | 目标操作系统，目前仅支持 `linux`。 |
| `platform.arch` | string | 是 | - | 目标架构，如 `x86_64`、`aarch64` 等。 |
| `host_interface` | string | 是 | - | 宿主机端 veth 网卡名称（长度不超过 15 字符，如 `land-mihomo`）。 |
| `controller_socket` | string | 是 | - | 外部控制 Unix Socket 路径，统一约定在 `/run/landscape/plugins/{id}/controller.sock`。 |
| `ui_path` | string | 否 | `"/ui/zashboard/"` | Web 控制台相对路径；系统会自动检测子目录直达。 |
| `network.namespace` | string | 否 | `land-{id}` | NetNS 命名空间名称。 |
| `network.peer_interface` | string | 否 | `"plugin0"` | 插件命名空间内的 veth 虚拟接口名。 |
| `network.tproxy_port` | integer | 否 | `12345` | 透明代理重定向的目标监听端口。 |
| `network.host_ipv4` | string | 否 | `"100.64.127.1"` | 宿主机虚拟接口 IPv4（CGNAT 网段网关）。 |
| `network.peer_ipv4` | string | 否 | `"100.64.127.2"` | 插件端接口 IPv4 地址。 |
| `service.kind` | string | 是 | `"mihomo"` | 服务类型，目前官方支持 `mihomo`。 |
| `service.executable` | string | 是 | - | 相对于解压目录的可执行二进制相对路径（如 `bin/mihomo`）。 |
| `service.default_config`| string | 是 | - | 相对于解压目录的默认基础配置（如 `config.yaml`）。 |
| `service.auto_restart` | boolean | 否 | `true` | 服务异常崩溃时是否自动尝试拉起。 |

---

## 4. 配置机制与 Mixin（覆写）规范

Landscape 实现了分层配置合并机制（User Config + System Override = Effective Config），既保障底层透明代理网络稳定，又赋予用户完全自定义节点的自由：

1. **用户配置（User Config - `config.yaml`）**：
   - 存放节点信息（`proxies`）、策略组（`proxy-groups`）、分流规则（`rules`）以及用户个性化的外部 UI 设置。
2. **系统覆写配置（System Override - `override.yaml`）**：
   - 由 Landscape 自动管控，确保关键网络参数符合插件运行要求：
     ```yaml
     # Landscape 自动注入的底层参数
     tproxy-port: 12345
     external-controller: 0.0.0.0:9090
     external-controller-unix: /run/landscape/plugins/mihomo/controller.sock
     external-ui: ""
     dns:
       enable: true
       nameserver:
         - 100.64.127.1
     ```
3. **合并生效配置（Effective Config）**：
   - 插件启动时，系统自动执行深度合并（Deep Merge），覆写底层端口与控制 Socket，生成最终生效的配置文件传给插件进程执行。

---

## 5. Web 控制台（UI）集成

插件控制面板通过 Landscape 的反向代理提供访问：

- **访问入口**：`https://<路由器IP>:<端口>/api/plugins/{id}/ui/zashboard/`
- **自动初始化**：Landscape 会自动在 URL Hash 中注入当前宿主机的 `hostname`、`port`、`protocol` 与 `secondaryPath: /api/plugins/{id}/ui`。Zashboard 等单页应用即可自动免密连接后端控制核心。
- **静态资源预置建议**：
  - 若希望离线即开即用，可在打包时将解压好的 Zashboard 资源放入 `data/ui/zashboard/`；
  - 亦可利用 Mihomo 原生的 `external-ui-url` 特性，在联网启动时自动拉取。

---

## 6. 打包构建脚本示例

以下为一个标准的 Mihomo 插件自动打包脚本示例（位于仓库 `examples/build-mihomo-plugin.sh`）：

```bash
#!/bin/sh
set -eu

if [ "$#" -ne 3 ]; then
  echo "用法: $0 <MIHOMO二进制路径> <版本号> <输出文件名.tar.gz>" >&2
  exit 2
fi

BIN_PATH="$1"
VERSION="$2"
OUTPUT_TAR="$3"
ROOT=$(cd -- "$(dirname -- "$0")" && pwd)

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

# 1. 拷贝二进制程序
mkdir -p "$STAGE/bin"
install -m 0755 "$BIN_PATH" "$STAGE/bin/mihomo"

# 2. 拷贝基础配置
cp "$ROOT/mihomo-plugin/config.yaml" "$STAGE/config.yaml"

# 3. 替换架构与版本号生成 manifest.json
ARCH=$(uname -m | sed 's/^x86_64$/x86_64/;s/^aarch64$/aarch64/')
sed -e "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" \
    -e "s/\"arch\": \"[^\"]*\"/\"arch\": \"$ARCH\"/" \
    "$ROOT/mihomo-plugin/manifest.json" > "$STAGE/manifest.json"

# 4. 压缩打包
tar --format=ustar -C "$STAGE" -czf "$OUTPUT_TAR" manifest.json config.yaml bin

echo "插件打包成功: $OUTPUT_TAR"
```

---

## 7. 导入与测试验证

1. 登录 Landscape 路由器后台，进入 **扩展管理** -> **插件** 页面；
2. 点击右上角 **安装插件包** 按钮，选择生成的 `.tar.gz` 文件进行上传；
3. 上传成功后，插件列表将显示该插件项：
   - 接口状态为 **可用**；
   - 转发模块与 TProxy 状态显示为 **可用**；
   - 服务状态点击 **启动**，待显示为 **运行中** 后，点击 **打开控制面板** 即可直接进入控制台管理节点。
