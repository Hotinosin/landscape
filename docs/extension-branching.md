# main / custom 分支与兼容约定

- `origin` 是只读上游（ThisSeanZhang/landscape）；不推送、不删除其分支。
- `main` 与 `fork/main` 精确镜像 `origin/main`。不加入定制文件或修改。
- `custom` 与 `fork/custom` 是唯一长期定制主线，包含扩展后端与一套定制 WebUI。默认 push 指向 fork，custom 跟踪 fork/custom。
- 旧本地与 fork 分支先把每个不同 tip 推送为 `archive/*-2026-10-04` tag，验证远端 tag 指向正确提交后再删除。旧发布仓库 `lkit-repository` 也按完整提交归档。

## 上游同步

```sh
git fetch origin
git switch main
git merge --ff-only origin/main
git push fork main
git switch custom
git merge main
```

在 custom 解决差异并验证；不要从旧归档重新覆盖上游已有实现。后续短期功能分支从 custom 创建、跟踪 fork 同名分支，经 PR 和 CI 合入后删除。main 镜像更新允许 fast-forward push；custom 禁止强推与删除，合入要求质量检查通过。

## 一套 WebUI

当前 API 基线和最低支持后端为上游 0.25.2；WebUI 版本为 0.25.2-custom.1。版本标识和功能支持分开：页面从 `/api/v1/system/info/capabilities` 获得能力。

| capability | 页面或行为 |
| --- | --- |
| gateway | 网关管理 |
| metric_persistent | 历史连接与 DNS 分析 |
| mem_track | 内存追踪 |
| plugins | 插件管理、网络目标选择 |
| dns_quic_diagnostics | H3/DoQ 诊断操作 |

上游只返回自身实现的能力；custom 额外声明 plugins 和 dns_quic_diagnostics。未加载、缺失接口或请求失败时扩展入口关闭，请求也在 API 层检查能力。退出登录清除能力缓存，避免跨会话沿用。不能仅以版本后缀判断扩展是否可用。

前端采用新上游 LAN device 接口，不再调用旧 DHCP assignments API。生成物不提交；`./gen_ts_bindings.sh` 从当前后端导出并用 Bun 生成。CI 从后端测试上传的 OpenAPI 生成前端，测试覆盖上游/定制能力组合。

## 工具与发布

Rust 只在 OrbStack Ubuntu / Linux 验证；Mac 入口是 `scripts/cargo.sh`。前端统一 Bun，Python 统一 uv。详见 [BUILD.zh.md](../BUILD.zh.md)。普通分支 push 不发布，定制 tag `v*-custom.*` 通过同提交质量门禁后才生成 prerelease。

改密码会撤销既有 HTTP、插件 cookie 和新的 WebSocket 握手凭证，同时原子替换长期系统 token；已建立的长连接不主动断开，需要重新连接才能应用握手撤销。
