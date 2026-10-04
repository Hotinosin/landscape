#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

(
    cd "$SCRIPT_DIR"
    "$SCRIPT_DIR/gen_ts_bindings.sh" --if-stale
    bun run --filter landscape-webui dev "$@"
)
