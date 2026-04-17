import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c75e480caaff46a3b66fc83f8a987d28',
  appName: 'managetutor',
  webDir: 'dist',
  server: {
    url: 'https://c75e480c-aaff-46a3-b66f-c83f8a987d28.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#ffffff',
  },
};

export default config;
