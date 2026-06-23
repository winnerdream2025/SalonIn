import type { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'My Salon In',
  slug: config.slug ?? 'salonin',
  android: {
    ...config.android,
    versionCode: 11,
    config: {
      googleMaps: {
        // Set GOOGLE_MAPS_API_KEY in EAS secrets:
        //   eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value <YOUR_KEY>
        // Get a key at: https://console.cloud.google.com → Maps SDK for Android
        // Use EXPO_PUBLIC_ prefix so this is also accessible at JS runtime
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? '',
      },
    },
  },
  ios: {
    ...config.ios,
    buildNumber: '10',
  },
})
