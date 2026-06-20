#!/usr/bin/env bash
# Launch the debug app on a connected device.

set -euo pipefail
source "$(dirname "$0")/_common.sh"

require_device

echo_step "Launching ${APP_ID}"
adb shell monkey -p "${APP_ID}" -c android.intent.category.LAUNCHER 1 >/dev/null
