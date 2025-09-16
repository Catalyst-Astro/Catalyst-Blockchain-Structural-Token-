import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, Button } from 'react-native';
import TokenForm from '../components/TokenForm';

// Stack navigator for token-related screens
const Stack = createStackNavigator();

function TokenMenu({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Emitir Tokens" onPress={() => navigation.navigate('Mint')} />
      <Button title="Transferir Tokens" onPress={() => navigation.navigate('Transfer')} />
      <Button title="Historial" onPress={() => navigation.navigate('History')} />
    </View>
  );
}

export default function TokenScreen() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Menu" component={TokenMenu} options={{ title: 'Tokens' }} />
      <Stack.Screen name="Mint" component={TokenForm} initialParams={{ type: 'mint' }} />
      <Stack.Screen name="Transfer" component={TokenForm} initialParams={{ type: 'transfer' }} />
      <Stack.Screen name="History" component={TokenForm} initialParams={{ type: 'history' }} />
    </Stack.Navigator>
  );
}
