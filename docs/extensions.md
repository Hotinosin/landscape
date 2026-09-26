# Extension 分支特有功能

本文档用于区分 `feature/extensions` 与上游原版功能。纯 WebUI 的主题配色、布局细节和一般交互样式调整不单列于此，本文档主要记录架构扩展、后端新增能力、数据模型变更及核心性能治理。

---

## 1. 托管插件系统（Managed Plugins）

- **标准打包规范**：支持基于 `tar.gz` 的标准插件归档包与声明式 `manifest.json`（详见 [`plugin.md`](plugin.md)），提供打包工具脚本（`examples/build-mihomo-plugin.sh`）。
- **完整生命周期管理**：提供插件包导入安装、启动（`start`）、停止（`stop`）、重启（`restart`）、状态查询、包卸载与安全清理。导入后插件服务默认保持停止，用户启动后通过 `service.enabled` 持久化启用状态。
- **服务守护与恢复**：已启用的插件服务异常退出后由 watchdog 自动重启；支持通过 `service.auto_restart` 关闭自动恢复，并通过失败次数限制和冷却时间避免持续重启。
- **多服务启动模板**：内置 `mihomo`、`sing-box`、`xray`、`v2ray` 的启动和配置检查参数，也支持通过 `service.run_args`、`service.check_args` 声明自定义参数模板。
- **在线运维与配置**：
  - **运行日志实时查看**：`GET /api/v1/plugins/{id}/logs`。
  - **配置文件在线读取与编辑下发**：`GET/PUT /api/v1/plugins/{id}/config`，支持用户配置（base）、系统覆写（override）及最终生效配置（effective）三层查看，并可在保存时执行启动前配置校验。
- **安全解包审计**：解包时严格校验相对路径与文件类型，拦截路径穿越（Path Traversal）与非正规文件释放。
- **隔离网络环境**：自动为插件配置专属 Linux Network Namespace（如 `land-mihomo`）、配对 `veth` 网卡与基于 RFC 6598 CGNAT 地址的独立网络；启动和停止服务时同步创建或清理 nftables masquerade/forward 与兼容的 iptables `FORWARD` 规则。
- **旧网络配置迁移**：加载插件时自动将旧的 `169.254.127.0/30` 链路本地地址迁移到默认的 `100.64.127.0/30` CGNAT 地址，并同步修正系统覆写配置。
- **独立 TProxy 转发器**：`redirect_pkg_handler` 支持 `--standalone` 模式，由宿主机为插件启动 eBPF TC 流量转发，无需依赖 Docker 容器身份。
- **Unix Domain Socket 代理**：插件控制接口（如控制器 Socket）直接挂载于 `/run/landscape/plugins/{id}/`，无需占用系统 TCP 端口，由 Web 后端（`plugin_proxy.rs`）在经过会话鉴权后反向代理至前端。
- **控制面板自动发现**：自动识别 `zashboard`、`dist`、`metacubexd`、`yacd` 等 UI 子目录，区分 Mihomo API 与静态资源路径，并根据当前页面协议生成控制面板连接信息以兼容 HTTPS。
- **分流联动**：插件网络接口（如 `land-mihomo`）在网络拓扑中可见，并可直接作为分流规则（Flow Target Rule）的出站目标接口。
- **主要入口**：
  - 后端：`landscape-webserver/src/plugins/`、`landscape-webserver/src/plugin_proxy.rs`
  - 前端：`landscape-webui/src/views/Plugins.vue`、`landscape-webui/src/api/plugins.ts`

---

## 2. GeoSite / GeoIP 实时反查（Lookup）

- **规则精确反查**：
  - 支持按域名实时反查 GeoSite 匹配条目及所属规则组：`POST /api/v1/geo/sites/cache/lookup`。
  - 支持按 IP 地址反查归属国家、所属 CIDR 掩码段及匹配网段：`POST /api/v1/geo/ips/cache/lookup`。
- **DNS 规则一致性**：GeoSite 反查统一遵循运行时 DNS 规则语义，仅匹配分组内条目，防止误命中分类名。
- **独立错误隔离**：单数据源刷新失败时返回独立错误，不阻断其他正常数据源。
- **主要入口**：
  - 后端：`landscape/src/geo/`、`landscape-webserver/src/geo/`
  - 前端：`landscape-webui/src/views/GeoDomain.vue` 中的反查面板

---

## 3. DoH3（DNS over HTTP/3）

- **QUIC 协议支持**：在 `landscape-dns` 中集成 HTTP/3 上游连接支持。
- **连通性与抖动诊断**：新增 `/api/v1/dns/upstreams/test-h3` 诊断接口，对指定域名执行多轮握手与真实解析测试，返回详细延时及故障原因。
- **主要入口**：
  - 后端：`landscape-dns/src/connection/`、`landscape-webserver/src/dns/upstreams.rs`
  - 前端：`landscape-webui/src/components/dns/upstream/UpstreamEditModal.vue`

---

## 4. 网络设置运行时 IP（Runtime Addresses）

- **内核实时采集**：通过 Netlink 直接读取内核网卡实际分配的 IPv4 与 IPv6 地址列表、前缀掩码及永久/临时生效状态。
- **动态拓扑呈现**：即便处于 DHCP/PPPoE 动态拨号状态，拓扑与网络项目列表也能实时呈现公网 IP 与本地 IP。
- **主要入口**：
  - 后端：`landscape/src/netlink/address.rs`、`landscape-webserver/src/services/ip.rs` (`/api/v1/services/ip/runtime-addresses`)
  - 前端：`landscape-webui/src/views/NetworkSettings.vue`

---

## 5. 配置资源独立命名与备注（Resource Name & Remark）

- **实体属性增强**：在数据库 Migration（`add_names_to_config_resources`）中，为核心配置表增加了独立的 `name`（名称）与 `remark`（备注）字段。
- **覆盖模块**：
  - 分流规则：`dst_ip_rule`
  - 防火墙与黑名单：`firewall_rule`、`firewall_blacklist`
  - DNS 规则与上游：`dns_rule`、`dns_upstream`、`dns_redirect`
  - NAT 与静态映射：`nat`、`static_nat_mapping_v4`、`static_nat_mapping_v6`
- **主要入口**：
  - 数据库迁移：`landscape-database/migration/src/m20260914_000000_add_names_to_config_resources.rs`
  - 前后端模型与编辑弹窗表单

---

## 6. 传输层协议与性能优化（HTTP/2 ALPN & 响应自适应压缩）

- **HTTP/2 协议协商 (ALPN)**：
  - TLS 握手配置支持 `["h2", "http/1.1"]`，现代浏览器自动使用 HTTP/2 多路复用，突破 HTTP/1.1 单域名 6 连接限制。
  - 主要入口：`landscape/src/cert/mod.rs`
- **自适应响应压缩 (Brotli / Gzip)**：
  - Axum 全局挂载 `CompressionLayer`，自动对 HTML、静态 JavaScript/CSS 以及 `/api/v1` 的 JSON 响应进行透明压缩。
  - 前端体积由 ~700KB 压缩至 ~240KB（节省约 66% 传输体积），弱网及远程访问加载延迟显著降低。
  - 保持 `/api/ws` WebSocket 路由隔离，互不干扰。
  - 主要入口：`landscape-webserver/src/main.rs`、`Cargo.toml`

---

## 7. WebUI 架构与性能治理

- **Pinia Store 响应式内存泄漏治理**：修复 10 个状态 Store 在 3 秒轮询中动态生成未被 GC 的 `computed()` 副作用问题，解决浏览器标签页常驻运行卡死崩溃隐患。
- **路由感知按需轮询**：`fetch_interval.ts` 根据当前活动路由动态调度轮询队列，在“关于/系统设置”等非网络监控页面自动停止高频轮询，降低嵌入式 CPU 负荷达 60%。
- **Vite Rollup Chunk 深度分包**：将大型重量级依赖（`echarts`, `xterm`, `vue-flow`）单独拆分为延迟加载 chunk，主包体积由 366 KB 骤降至 70 KB。
- **WebSocket 协议动态自适应**：Web 终端与 Docker 实时流根据页面当前协议动态匹配 `ws:` 与 `wss:`，杜绝 HTTPS 模式下的 Mixed Content 阻断。
- **SWR 数据缓存与去重**：引入 `usePageRequest` 提供 TTL 缓存与并发请求去重。
- **路由悬停预加载 (Prefetch)**：侧边栏菜单悬停时触发异步路由 chunk 预加载，实现毫秒级即时切页。

---

## 8. 主题配置持久化

- **服务端持久化**：主题模式以及主题样式的预设、圆角、明度、色度、色相等 OKLCH 参数写入 `landscape.toml`，登录后可跨浏览器和设备恢复。
- **配置模型与接口**：`LandscapeUIConfig` 增加 `theme_style`，并纳入 UI 配置接口和 OpenAPI Schema。
- **主要入口**：
  - 后端模型：`landscape-common/src/config/settings.rs`
  - 前端状态：`landscape-webui/src/stores/preference.ts`

---

## 9. Extension 发布流程

- **触发范围**：仅在 `feature/extensions` 分支推送时构建并发布 Extension 版本。
- **版本规则**：发布版本必须符合 `X.Y.Z-extension.N`，并生成对应的 GitHub Release。
- **当前构建目标**：仅构建 `x86_64-unknown-linux-gnu`，不发布其他架构或 musl 静态版本。
- **发布产物**：包含 `landscape-webserver-x86_64`、`redirect_pkg_handler-x86_64`、前端静态资源、OpenAPI 文件及 SHA-256 校验文件。
- **主要入口**：`.github/workflows/build-and-release.yml`

---

## 10. 已合并入上游的功能

以下功能最初由 Extension 分支引入，现已被官方合并至上游 `v0.24.3` 主干：

- **GeoIP 单数据源增量更新**：`POST /api/v1/geo/ips/{name}/refresh`。

*注：同步上游时优先采用上游实现，并保持分支间接口兼容。*
