#!/usr/bin/env bash

if [[ "$(uname -s)" == Darwin ]]; then
  echo "Run this release build inside OrbStack Ubuntu; use scripts/cargo.sh for Rust development." >&2
  exit 1
fi

set -euo pipefail

echo "构建 Rust 项目..."
cargo build --release --target "$TARGET_ARCH" --features=metric-persistent,mem-track

echo "复制 Rust 构建产物到 $SCRIPT_DIR/output/landscape-webserver-$TARGET"
mkdir -p "$SCRIPT_DIR/output"
cp "$SCRIPT_DIR/target/$TARGET_ARCH/release/landscape-webserver" "$SCRIPT_DIR/output/landscape-webserver-$TARGET"
