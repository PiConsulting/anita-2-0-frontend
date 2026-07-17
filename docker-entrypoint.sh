#!/bin/sh
set -e

escape_js() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

RAG_API_URL_ESCAPED="$(escape_js "${VITE_RAG_API_URL:-}")"

cat >/usr/share/nginx/html/env-config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  VITE_RAG_API_URL: "${RAG_API_URL_ESCAPED}"
};
EOF

exec nginx -g 'daemon off;'
