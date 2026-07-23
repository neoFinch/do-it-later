# Scripts

Shell helpers for Android development. Run from the repo root:

```bash
./scripts/android-install-debug.sh
```

Make scripts executable once if needed:

```bash
chmod +x scripts/*.sh
```

## Commands

| Script | Description |
| --- | --- |
| `android-devices.sh` | List USB/emulator devices (`adb devices -l`) |
| `android-install-debug.sh` | Build web app, sync Capacitor, install debug APK on phone |
| `android-install-debug.sh --stream` | Same build, then `adb install --streaming -r` (Android 14+) |
| `android-install-debug.sh --skip-build` | Install existing `app-debug.apk` without rebuilding |
| `android-logcat.sh` | Stream filtered logs for Capacitor/WebView debugging |
| `android-logcat.sh --all` | Full unfiltered logcat stream |
| `android-launch.sh` | Open the app on the connected device |
| `android-uninstall.sh` | Remove the debug app from the device |
| `android-dev-live.sh` | `adb reverse` port 5173 for live Vite dev over USB |

## npm shortcuts

```bash
npm run android:install   # install debug build on connected device
npm run android:devices   # list devices
npm run android:logcat    # stream app logs
```

## Desktop (Electron)

Build, sync, and run the desktop app:

```bash
npm run desktop:sync   # build web assets + cap sync electron
npm run desktop:run    # launch the Electron window
npm run desktop:pack   # create installers (dmg/msi/AppImage via electron-builder)
```

For live reload during development, run Vite in one terminal (`npm run dev`), set `server.url: 'http://127.0.0.1:5173'` in `capacitor.config.ts`, then `npm run desktop:run`. Remove `server.url` before packaging.

If Electron crashes with `getAppPath` undefined, your shell may have `ELECTRON_RUN_AS_NODE=1` (common in IDE-integrated terminals). The `desktop:run` script unsets it; from a normal terminal you can also run `unset ELECTRON_RUN_AS_NODE` first.

## Notes

- **USB debugging** must be enabled on the phone; accept the computer RSA prompt.
- **`adb install --streaming`** streams the APK to the device instead of copying it first — useful for large builds on Android 14+. This is likely what people mean by an "adb stream" install.
- **`adb logcat`** is the log streaming command for live device output.
- App id: `io.ionic.starter`
