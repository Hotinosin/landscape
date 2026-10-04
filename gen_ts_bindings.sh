#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Always regenerate from this checkout; existence is not evidence of freshness.
case "${1:-}" in
  ""|--force|--if-stale) ;;
  *) echo "Usage: $0 [--force]" >&2; exit 1 ;;
esac
cd "$SCRIPT_DIR"
"$SCRIPT_DIR/scripts/cargo.sh" test --locked -p landscape-webserver export_openapi_json -- --nocapture
bun run --cwd landscape-types generate
