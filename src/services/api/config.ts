import { Platform } from 'react-native';

// The Android emulator reaches the Mac through 10.0.2.2; the iOS simulator shares localhost.
// shortcut: hard-coded dev URL; read from build config (react-native-config) before shipping.
export const API_URL = __DEV__
  ? `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:4000/api/v1`
  : 'https://api.nestwise.app/api/v1';
