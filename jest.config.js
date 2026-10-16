module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  resolver: 'react-native-reanimated/jest/resolver',
  // lucide's package exports resolve to .mjs, which Jest does not transform.
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  // These packages ship untranspiled ESM.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-navigation|lucide-react-native|react-native-svg|react-native-reanimated|react-native-worklets|react-native-gesture-handler|react-native-screens|react-native-size-matters)/)',
  ],
};
