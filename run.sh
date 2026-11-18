#!/usr/bin/env sh
# One-command start for the Motion Reels studio.
# Binds 0.0.0.0:3000 so Arena's live preview can reach it.
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run only)…"
  npm install --no-audit --no-fund
fi
echo "Starting Motion Reels → http://0.0.0.0:${PORT:-3000}"
exec node server.js
