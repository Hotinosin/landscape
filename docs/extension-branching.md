# Extension 分支开发约定

## 分支关系

- `origin/dev`：上游开发基线，不承载 Extension 修改。
- `feature/extensions-webui`：从 `origin/dev` 创建，只包含 Extension WebUI 修改。
- `feature/extensions`：从 `origin/dev` 创建，包含完整 Extension 后端和 WebUI。
- `feature/extensions-legacy`：旧 Extension 快照，仅用于追溯和迁移，不继续开发。

更新上游时，先把 `feature/extensions-webui` 变基到最新 `origin/dev`；随后把前端提交同步到 `feature/extensions`，并在完整分支验证前后端集成。

## WebUI 边界

`feature/extensions-webui` 不包含 Extension 后端修改，只负责：

- Extension 页面、主题、组件和交互；
- 插件管理前端；
- H3/DoQ 测试前端；
- 与当前后端 OpenAPI 对齐的 API 调用适配。

`feature/extensions` 是完整可发布项目，包含 Extension 后端和上述全部 WebUI 修改。

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
