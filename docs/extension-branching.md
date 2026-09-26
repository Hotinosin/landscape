# Extension 分支开发约定

## 分支关系

- `origin/dev`：上游开发基线，不承载 Extension 修改。
- `feature/extensions-backend`：从 `origin/dev` 创建，只包含 Extension 后端能力。
- `feature/extensions-webui`：基于 `feature/extensions-backend`，叠加完整 Extension WebUI。
- `feature/extensions-legacy`：旧 Extension 快照，仅用于追溯和迁移，不继续开发。

更新上游时，先把 `feature/extensions-backend` 变基到最新 `origin/dev`，解决后端差异并验证；随后再把 `feature/extensions-webui` 变基到新的后端分支。

## WebUI 边界

`feature/extensions-backend` 不包含 `landscape-webui` 修改。`feature/extensions-webui` 负责：

- Extension 页面、主题、组件和交互；
- 插件管理前端；
- H3/DoQ 测试前端；
- 与当前后端 OpenAPI 对齐的 API 调用适配。

`landscape-types/src/api` 和 `landscape-types/openapi.json` 是生成物，不提交。后端 API 变化后应先在 OrbStack Ubuntu 导出 OpenAPI，再用 Bun 生成客户端：

```sh
CARGO_TARGET_DIR=/home/ho/.cache/landscape-target \
  cargo test -p landscape-webserver export_openapi_json -- --nocapture
bun --cwd landscape-types run generate
```

## 验证

- Rust 只在 OrbStack Ubuntu 中执行检查和编译，不在 Mac 本机编译。
- WebUI 使用 Bun：`bun --cwd landscape-webui run test`、`bun --cwd landscape-webui run build`。
- 上游已经实现的功能以上游版本为准，不从旧 Extension 覆盖回来。
