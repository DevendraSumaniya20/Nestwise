/**
 * Nestwise — run your flat without the group-chat chaos.
 *
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FlatProvider } from './src/store/FlatProvider';
import { AsyncStorageFlatRepository } from './src/data/AsyncStorageFlatRepository';
import { RootTabs } from './src/navigation/RootTabs';

const repository = new AsyncStorageFlatRepository();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <FlatProvider repository={repository}>
          <RootTabs />
        </FlatProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

export default App;
