import * as Keychain from 'react-native-keychain';

const SERVICE = 'app.nestwise.session';

/** Session token lives in the iOS Keychain / Android Keystore, never in AsyncStorage. */
export const tokenStore = {
  async get(): Promise<string | null> {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    return creds ? creds.password : null;
  },
  async set(token: string): Promise<void> {
    await Keychain.setGenericPassword('session', token, { service: SERVICE });
  },
  async clear(): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE });
  },
};
