#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "sojourn.config.json" ]; then
  echo "Error: sojourn.config.json not found in $SCRIPT_DIR"
  echo "Copy sojourn.config.sample.json and fill in your values."
  exit 1
fi

echo "Starting Sojourn..."
node server/dist/index.js
