#!/usr/bin/env bash
# List connected Android devices/emulators.

set -euo pipefail
source "$(dirname "$0")/_common.sh"

require_adb
echo_step "Connected devices"
adb devices -l
