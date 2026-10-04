#!/usr/bin/env bash

if [[ "$(uname -s)" == Darwin ]]; then
  echo "Run this release build inside OrbStack Ubuntu; use scripts/cargo.sh for Rust development." >&2
  exit 1
fi

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/scripts/build_env.sh"
source "$SCRIPT_DIR/scripts/build_webpage.sh"
source "$SCRIPT_DIR/scripts/build_server.sh"
