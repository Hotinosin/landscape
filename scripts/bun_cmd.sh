#!/usr/bin/env bash

bun_cmd() {
    if command -v bun >/dev/null 2>&1; then
        bun "$@"
        return
    fi

    echo "bun not found. Install Bun 1.4 or newer." >&2
    return 127
}
