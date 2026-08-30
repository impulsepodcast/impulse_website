#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CAPTION_DIR="${1:-$PROJECT_DIR/.transcript-work/captions}"
YTDLP_BIN="${YTDLP_BIN:-yt-dlp}"

if ! command -v "$YTDLP_BIN" >/dev/null 2>&1; then
  echo "yt-dlp is required. Install it with pipx install yt-dlp, then retry."
  exit 1
fi

mkdir -p "$CAPTION_DIR"

rg --no-filename '^  youtube:' "$PROJECT_DIR"/content/episodes/[0-9]*.md \
  | sed 's/^  youtube: //' \
  | "$YTDLP_BIN" \
      --skip-download \
      --write-subs \
      --write-auto-subs \
      --sub-langs 'en.*,en' \
      --sub-format vtt \
      --no-overwrites \
      --no-warnings \
      -o "$CAPTION_DIR/%(id)s.%(ext)s" \
      -a -

echo "YouTube captions saved in $CAPTION_DIR"
