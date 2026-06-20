#!/usr/bin/env bash
# Uninstall the debug app from a connected device.

set -euo pipefail
source "$(dirname "$0")/_common.sh"

require_device

echo_step "Uninstalling ${APP_ID}"
adb uninstall "${APP_ID}" || true
