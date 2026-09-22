# main-webui 同步说明

`main-webui` 使用上游原版后端。同步 `feature/extensions` 的前端改动时，只同步样式、布局、通用组件和不改变接口契约的交互优化。

## 必须剔除的 Extension 功能

| 功能                   | 前端入口或文件                                                                                   | Extension 后端依赖                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 插件管理               | `/plugins`、`src/views/Plugins.vue`、`src/api/plugins.ts`、侧栏与插件国际化                      | `/api/v1/plugins`、`/api/plugins/*`                              |
| 插件作为 Flow 出口     | `FlowTargetRule.vue`、`flow_target.ts` 及 Flow 展示组件中的 `plugin:` 目标                       | 插件服务与网络命名空间                                           |
| DoH3 在线测试          | DNS 上游编辑器中的“测试 H3”及结果弹窗                                                            | `POST /api/v1/dns/upstreams/test-h3`                             |
| Geo 反向查询           | GeoSite 域名查询确认、GeoIP 地址反查                                                             | `/api/v1/geo/sites/cache/lookup`、`/api/v1/geo/ips/cache/lookup` |
| 运行时接口地址         | 网络配置中的实时地址展示                                                                         | `GET /api/v1/services/ip/runtime-addresses`                      |
| 主题样式后端持久化     | `LandscapeUIConfig.theme_style` 的读取和保存                                                     | `landscape.toml` 的 `ui.theme_style`                             |
| Extension 配置名称字段 | DNS 上游、DNS 重定向、目标 IP 规则、静态 NAT v4/v6、防火墙黑名单及防火墙规则中的名称输入和名称列 | Extension 数据库迁移及新增 `name` 字段                           |

主题预设、强调色和圆角仍可保留，但在 `main-webui` 中只使用浏览器本地缓存，不写入原版后端。

## 下次同步步骤

1. 从 `feature/extensions` 取前端改动，不复制 `public/frontend.json`，保持名称 `Landscape WebUI` 和上游版本号。
2. 按上表删除 Extension 路由、API 调用、字段绑定和关联国际化文案。
3. 保留 `main-webui` 的 `landscape-types`，不要复制 Extension 生成的 OpenAPI 类型。
4. 搜索 `/api/v1/plugins`、`test-h3`、`cache/lookup`、`runtime-addresses`、`plugin:`，结果应为空或仅存在于本文档；`theme_style` 只能用于浏览器本地缓存，不能出现在后端配置读写中。
5. 运行前端类型检查、单元测试和构建；不需要编译后端。

新增 Extension 后端接口时，应先补充本表，再同步前端。
