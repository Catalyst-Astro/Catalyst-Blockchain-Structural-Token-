import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import TabNavigator from './src/navigation/TabNavigator';
import { SafeAreaView } from 'react-native';

export default function App() {
  return (
    <NavigationContainer>
      <SafeAreaView className="flex-1">
        <TabNavigator />
      </SafeAreaView>
    </NavigationContainer>
  );
}
