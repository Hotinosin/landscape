# Landscape WebUI 整体代码分析与架构溯源报告

## 一、分析基准与提交信息

本分析基于当前扩展特性分支（包含最新插件管理能力提交）与上游主干分支的对比比对完成。

* **当前扩展分支（Current Extension Branch）**：`feature/extensions`
  * **分析基准提交（Commit Hash / SHA-1）**：`0a84a18e6cfe3f709fe63e8637073a3810b4667d`
  * **提交信息**：`feat(plugins): support package archive format, service lifecycle, logs and config editing`
* **上游主干分支（Upstream Main Branch）**：`origin/main`
  * **对齐主干提交（Commit Hash / SHA-1）**：`80bc43eef7143ad029283fe2a8d510718c22af12`
  * **分叉基准（Merge Base）**：`80bc43eef7143ad029283fe2a8d510718c22af12`
* **对比变动规模**：涉及 371 个文件，23,400+ 行增删。

---

## 二、问题归属判定对照表（原有问题 vs 迁移重构遗留）

经过逐一查阅 Git 提交历史（`git log -S` / `git blame`），将梳理出的所有问题判定归属如下：

| 问题分类 | 具体表现 | 上游 `origin/main` 现状 | 当前分支现状 | 归属判定 |
| :--- | :--- | :--- | :--- | :--- |
| **API 通信** | 40+ 手动包装文件 (`src/api/*`) | 完全一致（提交 `d4dc9c77` 引入） | 保留了这层 snake_case 浅封装 | **上游原有历史包袱** |
| **API 通信** | 手写 Axios 实例与接口类型 (`plugins.ts`, `network.ts`) | 上游无插件接口 | `landscape-types` 未更新，退回手写 Axios | **扩展开发遗留问题** |
| **API 通信** | 旧接口调用 (`getIfacesOld` /all_old) | 完全一致，核心 store 一直调用旧接口 | 未切换至 `/all` 新接口 | **上游原有历史包袱** |
| **WebSocket** | 协议/端口拼接 Bug (`wss://` 硬编码、冒号 Bug) | 完全一致，源码原样存在 | 完全一致，未作修改 | **上游原有历史代码** |
| **WebSocket** | 测试代码遗留 (`"Hello Server!"`) | 完全一致，源码原样存在 | 完全一致，未作修改 | **上游原有调试遗留** |
| **WebSocket** | 死代码 `ReconnectingWebSocket` 未使用 | 完全一致，上游写了类却未引用 | 完全一致 | **上游原有死代码** |
| **目录结构** | 5 个空目录残留 (`icon`, `status_btn`, `flow`, `geo/.../detail`) | 目录内有文件 | 提交 `59727834` 删除了文件但残留目录 | **迁移/重构清理遗留** |
| **目录结构** | `views/` 目录下散落 Tab 子组件 | 曾是独立的页面路由 | 合并为复合页面后未移入 `components/` | **重构不彻底遗留** |
| **目录结构** | 目录名带 `.rs` (`src/lib/metric.rs/`) | 完全一致（提交 `f58eb4c0` 引入） | 完全一致 | **上游原有命名问题** |
| **目录结构** | 侧边栏拼写错误 (`LandscapeSiderBar.vue`) | 完全一致，创建时即拼错 | 完全一致 | **上游原有拼写错误** |
| **主题系统** | 828 行 OKLCH 引擎与 12 款预设 | 上游仅 45 行最简黑白切换 | 提交 `da609e4f` 引入的自研设计系统 | **重构引入的新系统** |
| **性能瓶颈** | 超大单体组件 `NetworkSettings.vue` (1,825行) | 上游无此文件（配置分散在各处） | 静态载入 12 个弹窗合并为大单体 | **重构引入的结构问题** |
| **性能瓶颈** | 全局 3 秒无条件轮询 15 个接口风暴 | 上游更严重（顺序 await 阻塞且易崩） | 使用 `allSettled` 改进但继承了轮询架构 | **上游原有架构缺陷** |
| **性能瓶颈** | 10 个 Store 动态创建 `computed` 反模式 | 完全一致，10 个 Store 逻辑一模一样 | 完全一致 | **上游原有代码模式** |
| **性能瓶颈** | 产物 241 个碎片化微型 Chunk | 完全一致（chunkSize 设为 5000 掩盖） | 完全一致 | **上游原有构建配置** |
| **依赖清理** | `@scalar/api-reference` 无用依赖 | 上游 `package.json` 原样存在 | 完全一致 | **上游原有依赖冗余** |
| **依赖清理** | 图标库清理 (`@vicons/*`) | 上游引入了 8 个 `@vicons/*` 库 | 精简为仅保留 `@vicons/carbon` | **扩展分支的主动优化** |

---

## 三、各专项问题深度分析

### 1. 前后端通信与 API 架构

#### (1) 双轨制 API 客户端与浅包装层
* **现状**：项目使用 Orval 基于 OpenAPI 生成了 `@landscape-router/types`，并配有 `mutator.ts` 自动解包 `{ data }`。然而 `landscape-webui/src/api/` 下仍保留了 40 多个手动编写的文件（如 `api/cert/order.ts`），其内容只是将驼峰函数包装为蛇形函数后 `export`。
* **根因**：上游在提交 `d4dc9c77` 中引入 Orval 时，为了避免修改前端所有 `.vue` 文件里的调用代码，做了这层过渡适配。
* **弊端**：包装函数未透传 Orval 支持的 `{ silent?: boolean, signal?: AbortSignal }` 参数，导致大部分页面失去了局部静默报错和请求中断取消的能力。

#### (2) OpenAPI 契约脱节导致退回手写 Axios
* **现状**：`api/plugins.ts` 和 `api/network.ts` 存在手写的 `axios.create(...)` 实例，散落着手动路径拼接和自建 TypeScript 接口（如 `PluginInfo`, `RuntimeIpAddress`）。
* **根因**：当前分支开发后端插件管理和运行时网络接口时，**未运行 `./gen_ts_bindings.sh` 重新生成 `landscape-types`**，导致前端无法从生成库中导入类型与 API，AI/开发者只能手写 Axios。

#### (3) WebSocket 协议与端口拼接 Bug
* **现状**：`stores/docker_img_task.ts` 和 `stores/pty.ts` 中存在：
  ```ts
  const url = `wss://${window.location.hostname}:${window.location.port}/api/ws/...`;
  ```
* **缺陷**：
  1. 协议固定为 `wss://`：在局域网纯 HTTP 部署或本地开发环境下会直接连接失败。应动态判断 `window.location.protocol === 'https:' ? 'wss:' : 'ws:'`。
  2. 端口冒号 Bug：在标准 80/443 端口下，`window.location.port` 为空字符串 `""`，拼接后 URL 会变成 `host:/api/ws/...`，导致连接抛错。应直接使用 `window.location.host`。
  3. `docker_img_task.ts` 连接建立后发送了无意义的调试语句 `socket.value?.send("Hello Server!");`。
* **根因**：完全继承自上游主干代码。

---

### 2. 陈旧代码与目录结构遗留

#### (1) 重构产生的 5 个空目录
* **现状**：磁盘上存在以下 5 个空目录：
  * `src/components/icon/`（原 `HideDocker.vue`）
  * `src/components/status_btn/`（原 11 个状态按钮组件）
  * `src/components/geo/site/detail/`（原 `GeoSiteDetailDrawer.vue`）
  * `src/components/geo/ip/detail/`（原 `GeoIpDetailDrawer.vue`）
  * `src/api/flow/`（原 `flow/index.ts`）
* **根因**：提交 `59727834` 将网络状态标签、流控等重构统一后，删除了内部文件，但 Git 无法删除空目录，导致本地残留。

#### (2) `views/` 目录下子组件散落
* **现状**：`StaticNatMappingV4.vue`、`DHCPv4Server.vue`、`CertAccounts.vue` 等非顶层路由组件仍放置在 `src/views/`。
* **根因**：这些原本在上游是独立的单页路由。重构将其聚合为复合 Tab 页面（`PortMappings.vue`, `NetworkAllocations.vue`, `Credentials.vue`）并将原路由配置为 redirect，但未将组件物理移至 `src/components/`。

#### (3) 死代码与无用依赖
* `src/lib/util.ts` 中 70 多行的 `ReconnectingWebSocket` 类从未 export，也从未被接入终端或任务。
* `package.json` 中的 `@scalar/api-reference` 从未在任何文件中引用。两者均来自上游遗留。

---

### 3. 性能优化空间

#### (1) 全局无条件轮询风暴（重大隐患）
* **现状**：`MainLayout.vue` 挂载 `IntervalFetch.vue`，默认每 3 秒无视用户当前所在路由，并发向后端发起 **15 个 HTTP GET 请求**（涵盖 sysinfo、docker、dns、网络、各微服务状态），外加尝试触发一次 docker 任务 WebSocket。
* **影响**：路由器通常为低功耗嵌入式环境，高频并发请求会导致网关后台 CPU 持续空转；前端也频繁触发垃圾回收。
* **优化方向**：引入按需订阅机制（仅当用户处于仪表盘或网络拓扑时才激活轮询，离开即休眠）；或推动后端提供一个汇总状态接口（`/services/status/summary`）。

#### (2) 超大单体组件 `NetworkSettings.vue`
* **现状**：1,825 行单文件，打包产物达 366 KB。页面以静态同步方式引入了 12 个大型编辑弹窗（NAT、防火墙、IP、PPPoE、WiFi 等）。
* **影响**：即便用户仅仅浏览网络列表，浏览器也必须加载、解析和初始化全部 12 个弹窗及其表单组件。
* **优化方向**：使用 `defineAsyncComponent` 对这 12 个弹窗进行懒加载拆分。

#### (3) Computed 反模式导致缓存失效
* **现状**：10 个 `status_*.ts` Store 中，均通过 `function GET_STATUS_BY_IFACE_NAME(name) { return computed(() => status.value.get(name)); }` 暴露状态。页面在循环/渲染时直接调用并读取 `.value`。
* **影响**：每次视图渲染都在动态新建 `ComputedRefImpl` 实例并立即丢弃，破坏了计算属性缓存机制，制造额外开销。
* **优化方向**：替换为普通查询函数或带参 Getter。

#### (4) 产物碎片化（241 个 Chunks）
* **现状**：`vite.config.ts` 设置了 `chunkSizeWarningLimit: 5000` 掩盖报警。构建产生了大量只有几十字节的微型 chunk（如 `_common--bpPxTOS.js: 84B`），容易在 HTTP/1.1 或弱网下造成加载瀑布流。
* **优化方向**：在 Rollup 配置中加入 `manualChunks` 合理聚拢第三方依赖。

---

## 四、治理与实施路线图（建议规划）

### 第一阶段：清理扩展分支遗留的“技术毛刺”（成本低、见效快）
1. **同步类型定义**：执行 `./gen_ts_bindings.sh`，使 `landscape-types` 包含最新的插件与网络路由，清理 `api/plugins.ts` 中的手写 Axios 与手写类型。
2. **清理空目录**：物理删除 `src/components/icon`、`src/components/status_btn` 等 5 个空文件夹。
3. **归正子组件目录**：将 `StaticNatMappingV4/V6`、`DHCPv4Server` 等子视图从 `views/` 移入 `components/`。
4. **弹窗异步化**：对 `NetworkSettings.vue` 中的 12 个编辑弹窗使用 `defineAsyncComponent` 拆分。

### 第二阶段：修复上游固有缺陷（高可用与鲁棒性）
1. **修复 WebSocket**：统一改用 `location.protocol === 'https:' ? 'wss:' : 'ws:'` 与 `location.host` 拼接，清理 `"Hello Server!"` 调试字符串。
2. **改造轮询机制**：将全局无条件 3 秒 15 请求改造为“根据当前路由按需轮询”，页面销毁时自动挂起。
3. **消除 Computed 滥用**：将 10 个状态 Store 的查询方法改为普通函数。
4. **移除无用依赖**：从 `package.json` 中移除 `@scalar/api-reference`，清理 `util.ts` 中的未用死代码。
