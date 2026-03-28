import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kinderspark.pro',
  appName: 'KinderSpark Pro',
  
  // webDir is required by Capacitor CLI, but won't be used since we load from server URL
  webDir: 'www',

  // Point to your live Railway deployment
  // The iOS app loads this URL inside a native WKWebView
  server: {
    url: 'https://kinderspark-pro-production.up.railway.app',
    cleartext: false,         // HTTPS only
    allowNavigation: [
      'kinderspark-pro-production.up.railway.app',
      'kinderspark-pro-production-af20.up.railway.app',
      '*.railway.app',
    ],
  },

  ios: {
    // iOS-specific settings
    scheme: 'KinderSpark Pro',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#1a1a2e',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#5E5CE6',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#5E5CE6',
      sound: 'beep.wav',
    },
  },
};

export default config;
