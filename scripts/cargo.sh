#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ "$(uname -s)" == Darwin ]]; then
  exec orb -m ubuntu -w "$ROOT" sh -c 'export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$HOME/.cache/landscape-custom-target}"; exec cargo "$@"' sh "$@"
fi
exec cargo "$@"
