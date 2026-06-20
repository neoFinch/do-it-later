#!/usr/bin/env bash
# Shared helpers for project shell scripts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_ID="io.ionic.starter"
DEBUG_APK="${ROOT_DIR}/android/app/build/outputs/apk/debug/app-debug.apk"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is not installed or not on PATH." >&2
    exit 1
  fi
}

require_adb() {
  require_command adb
}

require_device() {
  require_adb
  local count
  count="$(adb devices | awk 'NR>1 && $2=="device" { print $1 }' | wc -l | tr -d ' ')"
  if [[ "${count}" -eq 0 ]]; then
    echo "Error: no Android device connected (adb devices)." >&2
    echo "Enable USB debugging and accept the RSA prompt on your phone." >&2
    exit 1
  fi
}

cd_root() {
  cd "${ROOT_DIR}"
}

echo_step() {
  echo ""
  echo "==> $*"
}
