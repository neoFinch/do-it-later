#!/usr/bin/env bash
# Reverse-port the Vite dev server so a USB-connected phone can load http://localhost:5173
#
# Usage:
#   Terminal 1: npm run dev
#   Terminal 2: ./scripts/android-dev-live.sh
#   Then in capacitor.config.ts temporarily set server.url to http://localhost:5173 and reinstall.

set -euo pipefail
source "$(dirname "$0")/_common.sh"

PORT="${1:-5173}"

require_device

echo_step "Reversing port ${PORT} (device localhost -> laptop localhost)"
adb reverse "tcp:${PORT}" "tcp:${PORT}"

echo "Device can now reach your dev server at http://localhost:${PORT}"
echo "List active reverses: adb reverse --list"
