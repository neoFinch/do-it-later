/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'io.ionic.starter',
  productName: 'Offload',
  directories: {
    output: 'dist',
    buildResources: 'assets',
  },
  mac: {
    icon: 'assets/icon.icns',
  },
  win: {
    icon: 'assets/icon.ico',
  },
  linux: {
    icon: 'assets/icon.png',
  },
  files: [
    'build/**/*',
    'app/**/*',
    'generated/**/*',
    'package.json',
    // Platform runtime + plugins, prepared by `capacitor-electron vendor`.
    { from: 'vendor/node_modules', to: 'node_modules' },
  ],
};
