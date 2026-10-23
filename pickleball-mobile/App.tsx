import 'react-native-reanimated';
import './global.css';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/AppNavigator';
import { SessionProvider } from './src/SessionContext';

export default function App() {
  return (
    <SessionProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SessionProvider>
  );
}
