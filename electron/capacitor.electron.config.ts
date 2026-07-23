import path from 'path';
import { app, BrowserWindow, nativeImage } from 'electron';
import { defineConfig } from '@capawesome/capacitor-electron/config';
import { ELECTRON_REMOTE_PROXY_PORT } from './remote-proxy-server';

const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');

const metadataProxyOrigins = `http://127.0.0.1:${ELECTRON_REMOTE_PROXY_PORT} http://localhost:${ELECTRON_REMOTE_PROXY_PORT}`;

const productionCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: " + metadataProxyOrigins,
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  `connect-src 'self' https: wss: ${metadataProxyOrigins}`,
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

const loadAppIcon = () => {
  const icon = nativeImage.createFromPath(iconPath);
  return icon.isEmpty() ? undefined : icon;
};

export default defineConfig({
  window: {
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
  },
  deepLinks: {
    scheme: 'offload',
  },
  csp: {
    policy: productionCsp
  },
  hooks: {
    beforeReady: () => {
      const icon = loadAppIcon();
      if (icon && process.platform === 'darwin' && app.dock) {
        app.dock.setIcon(icon);
      }
    },
    windowFactory: (options) => {
      const icon = loadAppIcon();
      return new BrowserWindow({
        ...options,
        ...(icon ? { icon } : {}),
      });
    },
  },
});
