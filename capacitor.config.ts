import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dabarbible.app',
  appName: 'DABAR',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#0F0D0A',
      showSpinner: false,
    },
    App: {
      // Custom URL schemes / deep links handled in App.tsx via appUrlOpen listener.
    },
  },
};

export default config;
