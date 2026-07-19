#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE_NAME="${BUNDLE_NAME:-impulse-deploy.tgz}"
BUNDLE_PATH="${ROOT_DIR}/${BUNDLE_NAME}"

cd "${ROOT_DIR}"

echo "Building site..."
npm run build

echo "Creating ${BUNDLE_NAME}..."
tar \
  --exclude='.github' \
  --exclude='node_modules' \
  -czf "${BUNDLE_PATH}" \
  dist \
  public \
  content \
  data \
  deploy \
  package.json \
  package-lock.json \
  README.md

echo "Bundle ready: ${BUNDLE_PATH}"
echo "Next:"
echo "1. Upload it to your server with scp"
echo "2. Extract it in your target directory"
echo "3. Run ./deploy/remote-release.sh on the server"
