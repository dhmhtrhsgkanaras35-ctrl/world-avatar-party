import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.228caa080e4a4d5995869c14c69ed314',
  appName: 'world-avatar-party',
  webDir: 'dist',
  server: {
    url: "https://228caa08-0e4a-4d59-9586-9c14c69ed314.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT_CONTENT',
      backgroundColor: '#000000'
    },
    ScreenOrientation: {
      orientation: 'portrait'
    },
    Keyboard: {
      resize: 'ionic'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: true,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small'
    }
  }
};

export default config;