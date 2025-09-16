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
=======
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';

import HomeScreen from './screens/HomeScreen';
import TokenScreen from './screens/TokenScreen';
import DAOScreen from './screens/DAOScreen';
import ContractsScreen from './screens/ContractsScreen';
import ProfileScreen from './screens/ProfileScreen';

// Entry point for FractalApp. Sets up tab navigation and theming.
const Tab = createBottomTabNavigator();

export default function App() {
  const scheme = useColorScheme();
  return (
    <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Tab.Navigator>
        <Tab.Screen name="Inicio" component={HomeScreen} />
        <Tab.Screen name="Tokens" component={TokenScreen} />
        <Tab.Screen name="DAO" component={DAOScreen} />
        <Tab.Screen name="Contratos" component={ContractsScreen} />
        <Tab.Screen name="Perfil" component={ProfileScreen} />
      </Tab.Navigator>

    </NavigationContainer>
  );
}
