import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dabarbible.app',
  appName: 'DABAR',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      backgroundColor: '#0F0D0A',
      showSpinner: false,
    },
  },
};

export default config;
