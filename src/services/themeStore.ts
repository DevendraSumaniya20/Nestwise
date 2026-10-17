import * as Keychain from 'react-native-keychain';

export type ThemePref = 'system' | 'light' | 'dark';

// Keychain is the app's only on-device store; the theme isn't secret, it just needs to survive restarts.
const SERVICE = 'app.nestwise.theme';

export const themeStore = {
  async get(): Promise<ThemePref> {
    const creds = await Keychain.getGenericPassword({ service: SERVICE }).catch(() => false as const);
    const v = creds ? creds.password : '';
    return v === 'light' || v === 'dark' ? v : 'system';
  },
  async set(pref: ThemePref): Promise<void> {
    await Keychain.setGenericPassword('theme', pref, { service: SERVICE });
  },
};
