#!/usr/bin/env bash
set -euo pipefail

APP_NAME="samo-dev"

echo "Resetting SAMO dev environment..."
echo "This will remove local Electron app state for: $APP_NAME"
echo

# Stop any running dev Electron instances
echo "Stopping running SAMO/Electron dev processes if present..."
pkill -f "samo" 2>/dev/null || true
pkill -f "electron-vite" 2>/dev/null || true
pkill -f "Electron" 2>/dev/null || true

echo

# Electron app state locations on macOS
PATHS=(
  "$HOME/Library/Application Support/$APP_NAME"
  "$HOME/Library/Caches/$APP_NAME"
  "$HOME/Library/Logs/$APP_NAME"
  "$HOME/Library/Saved Application State/$APP_NAME.savedState"
  "$HOME/Library/Preferences/$APP_NAME.plist"
)

echo "Removing dev app state..."
for path in "${PATHS[@]}"; do
  if [ -e "$path" ]; then
    echo "  rm -rf $path"
    rm -rf "$path"
  else
    echo "  skip $path"
  fi
done

echo
echo "Done."
echo
echo "Now run:"
echo "  pnpm dev"
