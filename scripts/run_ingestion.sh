#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "${VIRTUAL_ENV:-}" ]]; then
  if [[ -d "$ROOT_DIR/.venv" ]]; then
    source "$ROOT_DIR/.venv/bin/activate"
  fi
fi

python "$ROOT_DIR/scripts/run_ingestion.py" "$@"
