import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Later',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    CapacitorSQLite: {
      androidIsEncryption: false,
      iosIsEncryption: false
    }
  }
};

export default config;
