module.exports = {
  preset: '@react-native/jest-preset',
  // AsyncStorage v3 ships ESM only.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage)/)',
  ],
};
