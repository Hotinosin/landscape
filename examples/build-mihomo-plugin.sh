#!/bin/sh
set -eu

if [ "$#" -ne 3 ]; then
  echo "usage: $0 MIHOMO_BINARY VERSION OUTPUT.tar.gz" >&2
  exit 2
fi

root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/bin"
install -m 0755 "$1" "$stage/bin/mihomo"
cp "$root/mihomo-plugin/config.yaml" "$stage/config.yaml"
sed -e "s/\"version\": \"[^\"]*\"/\"version\": \"$2\"/" \
  -e "s/\"arch\": \"[^\"]*\"/\"arch\": \"$(uname -m | sed 's/^x86_64$/x86_64/;s/^aarch64$/aarch64/')\"/" \
  "$root/mihomo-plugin/manifest.json" > "$stage/manifest.json"
tar --format=ustar -C "$stage" -czf "$3" manifest.json config.yaml bin
