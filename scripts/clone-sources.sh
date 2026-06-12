#!/usr/bin/env bash
# Clone raw data dependencies (large files — kept in data/raw/, gitignored)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/data/raw"

if [ ! -d "$ROOT/data/raw/philippines-json-maps" ]; then
  git clone --depth 1 https://github.com/faeldon/philippines-json-maps.git "$ROOT/data/raw/philippines-json-maps"
fi

if [ ! -d "$ROOT/data/raw/psgc2" ]; then
  git clone --depth 1 https://github.com/xemasiv/psgc2.git "$ROOT/data/raw/psgc2"
fi

echo "Raw sources ready in data/raw/"
