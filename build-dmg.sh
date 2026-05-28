#!/bin/zsh
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo "🔥 Building SAMO DMG from:"
echo "$PROJECT_ROOT"
echo ""

if ! command -v pnpm >/dev/null 2>&1; then
  echo "❌ pnpm is not installed or not available in PATH."
  exit 1
fi

if [[ ! -f "package.json" ]]; then
  echo "❌ package.json not found. Run this from the SAMO project root."
  exit 1
fi

echo "🧹 Removing old dist folder..."
rm -rf dist

echo "🏗️ Running pnpm build..."
pnpm build

echo "📦 Building macOS DMG..."
pnpm electron-builder --mac

echo ""
echo "✅ DMG build complete."
echo ""

if [[ -d "dist" ]]; then
  echo "📁 Output files:"
  find dist -maxdepth 1 -type f \( -name "*.dmg" -o -name "*.zip" \) -print
fi

echo ""
echo "To open the dist folder:"
echo "open \"$PROJECT_ROOT/dist\""
open dist/mac-arm64
