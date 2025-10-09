#!/usr/bin/env bash

# Minimal Raspberry Pi setup for BIST News
# - Installs git/node/npm if missing (uses sudo/apt)
# - Configura Nginx su porta 80 sostituendo la pagina di default
# - Crea un servizio systemd per avvio automatico del backend
# - Clona la tua repo e copia SOLO: dist/, build.js, package.json, package-lock.json, server.js, .env.example
# - Installs npm packages
# - Ensures server-data structure and required JSON files exist

set -Eeuo pipefail

###############################################
# EDIT THESE IF NEEDED
###############################################
# Public GitHub repository URL containing the required files at the root
# Default to the repo you provided
REPO_URL="https://github.com/FastArcherX/bistnews.git"
REPO_BRANCH="main"

# Install directory on the Pi
APP_DIR="/opt/bistnews"
WWW_DIR="/var/www/bistnews"
SERVICE_NAME="bistnews"
APP_USER="${SUDO_USER:-${USER}}"

# Node server port (server.js reads PORT from env with fallback 3001)
PORT="3001"

###############################################

# Ensure sudo
if [[ $EUID -ne 0 ]]; then
  echo "[INFO] Re-running with sudo..."
  exec sudo -E bash "$0" "$@"
fi

# Install core tools if missing
missing=()
for bin in git node npm; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    missing+=("$bin")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "[INFO] Installing missing packages: ${missing[*]}"
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends git curl nodejs npm
fi

# Ensure Nginx is present
if ! command -v nginx >/dev/null 2>&1; then
  echo "[INFO] Installing nginx..."
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends nginx
fi

mkdir -p "${APP_DIR}" "${WWW_DIR}/dist"

WORK_DIR="/tmp/bistnews-src"
rm -rf "${WORK_DIR}"
mkdir -p "${WORK_DIR}"

echo "[1/4] Cloning repository (${REPO_BRANCH})..."
git clone --depth 1 --branch "${REPO_BRANCH}" "${REPO_URL}" "${WORK_DIR}"

echo "[2/4] Copying ONLY required files to ${APP_DIR}..."
mkdir -p "${APP_DIR}/dist"
rsync -a --delete "${WORK_DIR}/dist/" "${APP_DIR}/dist/"
install -m 0644 "${WORK_DIR}/build.js" "${APP_DIR}/build.js"
install -m 0644 "${WORK_DIR}/package.json" "${APP_DIR}/package.json"
if [[ -f "${WORK_DIR}/package-lock.json" ]]; then
  install -m 0644 "${WORK_DIR}/package-lock.json" "${APP_DIR}/package-lock.json"
fi
install -m 0644 "${WORK_DIR}/server.js" "${APP_DIR}/server.js"
if [[ -f "${WORK_DIR}/.env.example" ]]; then
  install -m 0644 "${WORK_DIR}/.env.example" "${APP_DIR}/.env.example"
  # seed .env from example only if .env doesn't exist yet
  if [[ ! -f "${APP_DIR}/.env" ]]; then
    cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
  fi
fi

# Set sensible defaults in .env if missing
PI_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
ENV_FILE="${APP_DIR}/.env"
touch "${ENV_FILE}"
grep -q '^PORT=' "${ENV_FILE}" || echo "PORT=${PORT}" >> "${ENV_FILE}"
if [[ -n "${PI_IP}" ]]; then
  DEFAULT_CORS="http://localhost:8080,http://127.0.0.1:8080,http://localhost,http://127.0.0.1,http://${PI_IP}"
else
  DEFAULT_CORS="http://localhost:8080,http://127.0.0.1:8080,http://localhost,http://127.0.0.1"
fi
grep -q '^CORS_ORIGINS=' "${ENV_FILE}" || echo "CORS_ORIGINS=${DEFAULT_CORS}" >> "${ENV_FILE}"
grep -q '^GOOGLE_CLIENT_ID=' "${ENV_FILE}" || echo "GOOGLE_CLIENT_ID=" >> "${ENV_FILE}"

# Ownership to app user
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

echo "[3/4] Installing Node dependencies..."
cd "${APP_DIR}"
if [[ -f package-lock.json ]]; then
  if ! npm ci --omit=dev; then
    echo "[WARN] npm ci failed, falling back to npm install"
    npm install --omit=dev
  fi
else
  npm install --omit=dev
fi

echo "[4/4] Ensuring server-data structure and files..."
DATA_DIR="${APP_DIR}/server-data"
mkdir -p \
  "${DATA_DIR}" \
  "${DATA_DIR}/uploads/articles" \
  "${DATA_DIR}/uploads/announcements" \
  "${DATA_DIR}/uploads/gallery"

ensure_json() {
  local f="$1"; shift
  if [[ ! -f "$f" ]]; then
    echo "{}" > "$f"
  fi
}

ensure_json "${DATA_DIR}/articles.json"
ensure_json "${DATA_DIR}/announcements.json"
ensure_json "${DATA_DIR}/comments.json"
ensure_json "${DATA_DIR}/views.json"
ensure_json "${DATA_DIR}/gallery.json"

echo
echo "[Deploy] Publishing frontend to Nginx web root..."
rsync -a --delete "${APP_DIR}/dist/" "${WWW_DIR}/dist/"
chown -R www-data:www-data "${WWW_DIR}"

echo "[Nginx] Writing site configuration..."
NGINX_SITE="/etc/nginx/sites-available/${SERVICE_NAME}.conf"
cat > "${NGINX_SITE}" <<'NGINX'
server {
  listen 80 default_server;
  server_name _;

  root /var/www/bistnews/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Socket.IO (WebSocket)
  location /socket.io/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 600s;
  }

  # API proxy
  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Uploaded images via backend
  location /uploads/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
  }
}
NGINX

ln -sf "${NGINX_SITE}" "/etc/nginx/sites-enabled/${SERVICE_NAME}.conf"
if [[ -e "/etc/nginx/sites-enabled/default" ]]; then
  rm -f "/etc/nginx/sites-enabled/default"
fi
nginx -t
systemctl reload nginx || systemctl restart nginx

echo "[systemd] Creating service for backend..."
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=BIST News Backend
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

echo
echo "✅ Setup completo. Il sito è ora su: http://$(hostname -I | awk '{print $1}')/"
echo "- Backend health: http://$(hostname -I | awk '{print $1}')/api/health"
echo "- File app: ${APP_DIR} | Frontend pubblicato in: ${WWW_DIR}/dist"
echo "- Servizio: systemctl status ${SERVICE_NAME}"
