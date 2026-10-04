# Build and development

[简体中文](BUILD.zh.md)

`main` mirrors upstream. All custom backend and WebUI development belongs on `custom`; see [branching and compatibility](docs/extension-branching.md).

## Toolchains

- Rust 1.98.0 with rustfmt and Clippy. On macOS, never invoke Cargo or Rust tools locally: `scripts/cargo.sh` runs them in OrbStack Ubuntu. Linux runs Cargo natively.
- Bun 1.4.2 for frontend installation, development, tests and builds. `bun.lock` is the only frontend lockfile.
- Python tools use `uv`; no Conda or `python -m venv`.

Install Linux dependencies inside Ubuntu:

```sh
sudo apt-get update
sudo apt-get install -y cmake clang curl gcc llvm make pkg-config libelf-dev libclang-dev zlib1g-dev zstd clang-format-18
```

## Daily development

From the repository root (also supported on macOS with OrbStack Ubuntu available):

```sh
bun install --frozen-lockfile
./gen_ts_bindings.sh
bun run --cwd landscape-webui dev
./scripts/cargo.sh test --locked -p landscape-webserver --bin landscape-webserver
./scripts/cargo.sh test --locked -p landscape-common --lib
```

`gen_ts_bindings.sh` always exports OpenAPI from the current backend commit, then generates clients with Bun. Generated `landscape-types/openapi.json` and `landscape-types/src/api` are not committed. There is no existence-only freshness shortcut.

The macOS wrapper stores Cargo artifacts in Ubuntu at `$HOME/.cache/landscape-custom-target`; it does not fill the VM's tmpfs. Override `CARGO_TARGET_DIR` inside Ubuntu if needed.

## Quality checks

```sh
./scripts/cargo.sh fmt --all -- --check
./scripts/cargo.sh clippy --locked --workspace --features metric-persistent,mem-track -- -D warnings
./scripts/cargo.sh test --locked -p landscape-common -p landscape-core -p landscape-dns --lib
bun run --cwd landscape-webui test
bun run --cwd landscape-webui build
bun run --cwd landscape-webui format:check
```

CI additionally runs feature-matrix Clippy, C formatting and configuration CLI end-to-end tests. eBPF/network integration tests require root in Linux and are separate from ordinary unit tests:

```sh
./scripts/cargo.sh test --locked -p landscape-ebpf --features bpf-test
```

## Packaging and releases

Run `bash ./build.sh -t x86_64` or `-t aarch64` inside Ubuntu. Release scripts reject macOS before invoking Rust. `scripts/build_musl_static.sh`, `scripts/build_gnu.sh` and `scripts/build_edge_bins.sh` provide Linux cross builds; their headers describe required sysroots and Zig tools.

`build.sh` builds the WebUI and copies Scalar browser assets to `output/static`, then packages the backend. The supported custom release trigger is a reviewed `v<upstream-version>-custom.<N>` tag. Quality checks must succeed before release build jobs; custom releases are prereleases and do not replace upstream Latest. A normal branch push runs quality checks only.

## Plugin log rotation

Log API reads are bounded to 64 KiB. Install [the logrotate template](scripts/landscape-plugins.logrotate) on the router and substitute the actual `--home` path (default `/root/.landscape-router`). Run logrotate hourly with a systemd timer or cron. It retains four compressed 10 MiB generations using `copytruncate`, so running processes keep their open log handles. Copytruncate can lose a few lines during rotation; it avoids adding a custom logging daemon.
