import 'react-native-reanimated';
import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { requireOptionalNativeModule } from 'expo';

import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  // ✅ Hide the Expo Go floating "gear" button
  useEffect(() => {
    const DevMenuPreferences = requireOptionalNativeModule('DevMenuPreferences');
    if (DevMenuPreferences) {
      DevMenuPreferences.setPreferencesAsync({
        showFloatingActionButton: false,
      }).catch((err: any) => {
        // Ignore errors in production or if the module isn't available
        console.log('Could not hide dev menu button:', err);
      });
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <AppNavigator />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}