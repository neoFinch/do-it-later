# Build resources

App icons for Electron packaging and the running app window/dock. Generated from the same Offload logo as Android/web:

```bash
python3 scripts/generate-app-icons.py
```

Files:

- `icon.png` — 1024×1024 (Linux + runtime window icon)
- `icon.icns` — macOS dock / `.app` bundle
- `icon.ico` — Windows taskbar / installer

See https://www.electron.build/configuration/icons for details.
