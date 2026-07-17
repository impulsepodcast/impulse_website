#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${TARGET_DIR:-/var/www/impulse}"
APP_USER="${APP_USER:-$(id -un)}"
APP_GROUP="${APP_GROUP:-$(id -gn)}"
PORT="${PORT:-3000}"
DOMAIN="${DOMAIN:-example.com}"
SERVICE_NAME="${SERVICE_NAME:-impulse}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-impulse}"

SERVICE_TEMPLATE="${ROOT_DIR}/impulse.service"
NGINX_TEMPLATE="${ROOT_DIR}/nginx.impulse.conf"
SERVICE_OUTPUT="/etc/systemd/system/${SERVICE_NAME}.service"
NGINX_OUTPUT="/etc/nginx/sites-available/${NGINX_SITE_NAME}"
NGINX_LINK="/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"

if [[ ! -f "${SERVICE_TEMPLATE}" || ! -f "${NGINX_TEMPLATE}" ]]; then
  echo "Deploy templates are missing from ${ROOT_DIR}." >&2
  exit 1
fi

echo "Preparing ${TARGET_DIR}..."
sudo mkdir -p "${TARGET_DIR}"
sudo chown -R "${APP_USER}:${APP_GROUP}" "${TARGET_DIR}"

service_tmp="$(mktemp)"
nginx_tmp="$(mktemp)"

cleanup() {
  rm -f "${service_tmp}" "${nginx_tmp}"
}

trap cleanup EXIT

sed \
  -e "s|__TARGET_DIR__|${TARGET_DIR}|g" \
  -e "s|__APP_USER__|${APP_USER}|g" \
  -e "s|__APP_GROUP__|${APP_GROUP}|g" \
  -e "s|__PORT__|${PORT}|g" \
  "${SERVICE_TEMPLATE}" > "${service_tmp}"

sed \
  -e "s|__DOMAIN__|${DOMAIN}|g" \
  -e "s|__PORT__|${PORT}|g" \
  "${NGINX_TEMPLATE}" > "${nginx_tmp}"

echo "Installing systemd service ${SERVICE_NAME}..."
sudo cp "${service_tmp}" "${SERVICE_OUTPUT}"
sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"

if command -v nginx >/dev/null 2>&1; then
  echo "Installing Nginx site ${NGINX_SITE_NAME}..."
  sudo cp "${nginx_tmp}" "${NGINX_OUTPUT}"
  sudo ln -sfn "${NGINX_OUTPUT}" "${NGINX_LINK}"
  sudo nginx -t
  sudo systemctl reload nginx
else
  echo "Nginx is not installed yet. Skipping Nginx configuration." >&2
fi

echo "Bootstrap complete."
echo "Next steps:"
echo "1. Upload the project or let GitHub Actions deploy into ${TARGET_DIR}."
echo "2. Start the app once code is present with: sudo systemctl restart ${SERVICE_NAME}"
echo "3. Add TLS separately, for example with Certbot."
