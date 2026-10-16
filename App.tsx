/**
 * Nestwise — run your flat without the group-chat chaos.
 *
 * @format
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FlatProvider } from './src/app/FlatProvider';
import { AsyncStorageFlatRepository } from './src/data/AsyncStorageFlatRepository';
import { AppShell } from './src/ui/AppShell';

const repository = new AsyncStorageFlatRepository();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <FlatProvider repository={repository}>
        <AppShell />
      </FlatProvider>
    </SafeAreaProvider>
  );
}

export default App;
