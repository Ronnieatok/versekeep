#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$REPO_ROOT/artifacts/versekeep"
OUTPUT_DIR="$REPO_ROOT/dist"

echo "Vercel working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "pnpm version: $(pnpm --version)"

if [[ ! -f "$APP_ROOT/package.json" ]]; then
  echo "VerseKeep package not found at $APP_ROOT" >&2
  exit 1
fi

rm -rf "$OUTPUT_DIR"
cd "$APP_ROOT"
pnpm exec expo export --platform web --output-dir "$OUTPUT_DIR"

if [[ ! -f "$OUTPUT_DIR/index.html" ]]; then
  echo "Expo export completed without $OUTPUT_DIR/index.html" >&2
  find "$OUTPUT_DIR" -maxdepth 2 -type f -print >&2 || true
  exit 1
fi

echo "Vercel static output ready: $OUTPUT_DIR/index.html"