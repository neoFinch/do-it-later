#!/usr/bin/env bash
# Stream device logs filtered to this app (Capacitor / Chromium / app process).
#
# Usage:
#   ./scripts/android-logcat.sh
#   ./scripts/android-logcat.sh --all   # no filter, full logcat stream

set -euo pipefail
source "$(dirname "$0")/_common.sh"

SHOW_ALL=false
if [[ "${1:-}" == "--all" ]]; then
  SHOW_ALL=true
fi

require_device

echo_step "Streaming logcat (Ctrl+C to stop)"

if [[ "${SHOW_ALL}" == true ]]; then
  adb logcat
else
  # Common tags for Capacitor/Ionic WebView debugging
  adb logcat \
    Capacitor:V \
    CapacitorSQLite:V \
    CapacitorShareTarget:D \
    ShareReceiveActivity:D \
    chromium:V \
    cr_WebView:V \
    ActivityManager:I \
    System.out:I \
    '*:S'
fi
