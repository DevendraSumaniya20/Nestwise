import * as Keychain from 'react-native-keychain';

// Which home was open last, so the app reopens it. Not secret; Keychain is the app's only on-device store.
const SERVICE = 'app.nestwise.lastFlat';

export const lastFlatStore = {
  get: () =>
    Keychain.getGenericPassword({ service: SERVICE }).then(
      c => (c ? c.password : null),
      () => null,
    ),
  set: (flatId: string) => Keychain.setGenericPassword('flat', flatId, { service: SERVICE }).then(() => {}),
};
