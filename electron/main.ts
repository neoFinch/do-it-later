import { createCapacitorElectronApp } from '@capawesome/capacitor-electron';

import config from './capacitor.electron.config';
import { startRemoteProxyServer } from './remote-proxy-server';

void startRemoteProxyServer()
  .then(() => createCapacitorElectronApp(config))
  .catch((error) => {
    console.error('[offload] Failed to start desktop app', error);
    process.exit(1);
  });
