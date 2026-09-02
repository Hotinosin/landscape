#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/scripts/bun_cmd.sh"

(
    cd "$SCRIPT_DIR"
    "$SCRIPT_DIR/gen_ts_bindings.sh" --if-stale
    bun_cmd run --cwd "$SCRIPT_DIR/landscape-webui" dev "$@"
)
