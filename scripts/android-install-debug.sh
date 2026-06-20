#!/usr/bin/env bash
# Build the web app, sync Capacitor, and install the debug APK on a connected device.
#
# Usage:
#   ./scripts/android-install-debug.sh           # build + gradle installDebug
#   ./scripts/android-install-debug.sh --stream  # build APK then adb install --streaming
#   ./scripts/android-install-debug.sh --skip-build  # install existing debug APK only

set -euo pipefail
source "$(dirname "$0")/_common.sh"

USE_STREAM=false
SKIP_BUILD=false

for arg in "$@"; do
  case "${arg}" in
    --stream) USE_STREAM=true ;;
    --skip-build) SKIP_BUILD=true ;;
    -h|--help)
      echo "Usage: $0 [--stream] [--skip-build]"
      echo "  --stream      Use 'adb install --streaming' (Android 14+, large APKs)"
      echo "  --skip-build  Skip npm build/sync; install existing app-debug.apk"
      exit 0
      ;;
    *)
      echo "Unknown option: ${arg}" >&2
      exit 1
      ;;
  esac
done

require_device
cd_root

if [[ "${SKIP_BUILD}" == false ]]; then
  echo_step "Building web assets"
  npm run build

  echo_step "Syncing Capacitor Android project"
  npx cap sync android

  echo_step "Assembling debug APK"
  (cd android && ./gradlew assembleDebug)
fi

if [[ ! -f "${DEBUG_APK}" ]]; then
  echo "Error: debug APK not found at ${DEBUG_APK}" >&2
  exit 1
fi

if [[ "${USE_STREAM}" == true ]]; then
  echo_step "Installing via adb install --streaming"
  adb install --streaming -r "${DEBUG_APK}"
else
  echo_step "Installing via gradlew installDebug"
  (cd android && ./gradlew installDebug)
fi

echo_step "Done. App id: ${APP_ID}"
