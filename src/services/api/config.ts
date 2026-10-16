import { Platform } from 'react-native';

// The Android emulator reaches the Mac through 10.0.2.2; the iOS simulator shares localhost.
const LOCAL = `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:4000/api/v1`;

// shortcut: no production API exists yet, so release builds (used for E2E) also talk to the
// local server. Swap in the real HTTPS URL, ideally from build config, before shipping.
export const API_URL = LOCAL;
