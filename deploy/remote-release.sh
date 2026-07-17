#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="${SERVICE_NAME:-impulse}"

cd "${ROOT_DIR}"

echo "Installing production dependencies..."
npm ci --omit=dev

echo "Restarting ${SERVICE_NAME}..."
sudo systemctl restart "${SERVICE_NAME}"

echo "Release complete."
echo "Health check tip: curl -I http://127.0.0.1:3000/"
