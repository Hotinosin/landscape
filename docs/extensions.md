# Extension 分支特有功能

本文档用于区分 `feature/extensions` 与上游原版功能。纯 WebUI 的主题、布局、列表、弹窗和交互样式调整不属于 Extension 特有功能。

## Managed Plugins

- 提供插件导入、删除、状态查询和管理页面代理。
- 支持将插件网络接口作为 Flow 出口。
- 在网络设置拓扑中展示插件接口，并可跳转到插件管理页面。
- 主要入口：`landscape-webserver/src/plugins`、`landscape-webserver/src/plugin_proxy.rs`、`landscape-webui/src/views/Plugins.vue`。

## GeoSite / GeoIP Lookup

- 支持按域名反查 GeoSite 数据及匹配规则。
- 支持按 IP 地址反查 GeoIP 数据及匹配网段。
- GeoSite 查询统一使用运行时 DNS 规则语义，只匹配分组内规则，不匹配分类名称。
- 主要入口：`/api/v1/geo/sites/cache/lookup`、`/api/v1/geo/ips/cache/lookup` 和 Geo 数据页面的查询区域。

## DoH3

- 为 DoH 上游增加 HTTP/3 开关和连接测试。
- H3 测试使用当前上游配置的域名，并返回多次测试结果和失败信息。
- 主要入口：`landscape-dns` 的 DoH3 连接逻辑、`/api/v1/dns/upstreams/test-h3` 和上游 DNS 编辑弹窗。

## 网络设置运行时 IP

- 提供 WAN 接口当前运行时 IPv4 地址，用于网络设置拓扑展示。
- 主要入口：`/api/v1/services/ip/runtime-addresses` 和 `NetworkSettings.vue`。

## 已进入上游的功能

以下功能最初由 Extension 增加，但已进入上游 `v0.24.3`，不再视为分支特有功能：

- GeoIP 单数据源更新：`POST /api/v1/geo/ips/{name}/refresh`。

同步上游时应优先采用上游实现，并在两个分支中保留。
