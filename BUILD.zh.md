# 构建与开发

[English](BUILD.md)

`main` 镜像上游；后端扩展和定制 WebUI 都在唯一主线 `custom` 开发，参见 [分支与兼容约定](docs/extension-branching.md)。

## 工具链

- Rust 固定 1.98.0。Mac 禁止直接执行 Cargo、Rust 格式化或 Clippy；统一用 `scripts/cargo.sh` 进入 OrbStack Ubuntu。Linux 可原生执行。
- 前端统一 Bun 1.4.2；仅保留 `bun.lock`。
- Python 使用 uv 管理依赖与环境。

在 Ubuntu 安装系统依赖：

```sh
sudo apt-get update
sudo apt-get install -y cmake clang curl gcc llvm make pkg-config libelf-dev libclang-dev zlib1g-dev zstd clang-format-18
```

## 日常开发与验证

以下命令在仓库根目录执行，Mac 需先准备 OrbStack Ubuntu：

```sh
bun install --frozen-lockfile
./gen_ts_bindings.sh
bun run --cwd landscape-webui dev
./scripts/cargo.sh fmt --all -- --check
./scripts/cargo.sh clippy --locked --workspace --features metric-persistent,mem-track -- -D warnings
./scripts/cargo.sh test --locked -p landscape-webserver --bin landscape-webserver
./scripts/cargo.sh test --locked -p landscape-common -p landscape-core -p landscape-dns --lib
bun run --cwd landscape-webui test
bun run --cwd landscape-webui build
bun run --cwd landscape-webui format:check
```

API 生成脚本每次都从当前后端提交导出 OpenAPI，再由 Bun 生成客户端，不再根据文件是否存在跳过。`landscape-types/openapi.json` 与 `landscape-types/src/api` 不提交。

Mac 包装脚本把 Rust 产物放在 Ubuntu 的 `$HOME/.cache/landscape-custom-target`，避免占满 `/tmp` tmpfs。CI 还执行功能矩阵 Clippy、C 格式检查和配置 CLI E2E。eBPF 与网络集成测试需要 Linux root，普通单元测试不代表已验证生产数据面。

## 打包与发布

在 Ubuntu 执行 `bash ./build.sh -t x86_64` 或 `-t aarch64`。发布脚本在 Mac 会提前退出。Linux 交叉构建脚本为 `scripts/build_musl_static.sh`、`scripts/build_gnu.sh` 与 `scripts/build_edge_bins.sh`，系统依赖与 sysroot 详见脚本头部。

普通 push 只触发质量检查。正式定制发布以 `v<上游版本>-custom.<序号>` tag 触发，必须先通过同提交质量门禁；产物标记为 prerelease，不替代上游 Latest。前端打包同时复制 Scalar 静态资源到 `output/static`。

## 插件日志轮转

日志 API 最多读取末尾 64 KiB。将 [logrotate 模板](scripts/landscape-plugins.logrotate) 安装到路由器，并按实际 `--home` 路径修改（默认 `/root/.landscape-router`）；以 systemd timer 或 cron 每小时执行。模板保留四份压缩归档，超过 10 MiB 后轮转，`copytruncate` 保持进程的日志句柄；轮转瞬间可能损失少量日志行。

交叉编译的 Zig Python 包通过 uv 安装（在 Ubuntu 内）：

```sh
uv venv --python 3.12 .zig-venv
uv pip install --python .zig-venv/bin/python ziglang==0.16.0
source .zig-venv/bin/activate
```

Edge 镜像仅由手动 workflow 在质量门禁通过后发布。
