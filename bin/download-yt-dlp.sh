#!/usr/bin/env bash
# Downloads the latest yt-dlp ARM64 binary for Steam Deck deployment.
# Run this once before building/deploying the plugin.
set -e

DEST="$(dirname "$0")/yt-dlp"
URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux"

echo "Downloading yt-dlp (ARM64) from GitHub releases..."
curl -L "$URL" -o "$DEST"
chmod +x "$DEST"
echo "Done: $DEST"
