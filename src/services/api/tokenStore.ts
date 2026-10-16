import * as Keychain from 'react-native-keychain';

const SERVICE = 'app.nestwise.session';
const OPTIONS = {
  service: SERVICE,
  // iOS: Keychain item readable only while unlocked, never synced/backed up to another device.
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  // Android: encrypted with an AES-GCM key held in the Android Keystore.
  storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
};

export type Tokens = { accessToken: string; refreshToken: string };

/** Both tokens live in the iOS Keychain / Android Keystore, never in AsyncStorage. */
export const tokenStore = {
  async get(): Promise<Tokens | null> {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    if (!creds) return null;
    try {
      const t = JSON.parse(creds.password) as Partial<Tokens>;
      return t.accessToken && t.refreshToken ? { accessToken: t.accessToken, refreshToken: t.refreshToken } : null;
    } catch {
      return null; // token from an older app version
    }
  },
  async set(tokens: Tokens): Promise<void> {
    await Keychain.setGenericPassword('session', JSON.stringify(tokens), OPTIONS);
  },
  async clear(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE });
  },
};
