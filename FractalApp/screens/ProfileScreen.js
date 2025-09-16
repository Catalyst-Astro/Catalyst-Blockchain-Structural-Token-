import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { getProvider } from '../lib/rpc';

export default function ProfileScreen() {
  const [address, setAddress] = useState('');
  const [alias, setAlias] = useState('');
  const [archetype, setArchetype] = useState('');
  const [reputation, setReputation] = useState('');

  useEffect(() => {
    async function load() {
      const provider = getProvider();
      try {
        const signer = provider.getSigner();
        setAddress(await signer.getAddress());
        // Load alias, archetype and reputation from your contract storage
      } catch (err) {
        console.warn(err);
      }
    }
    load();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Dirección: {address}</Text>
      <TextInput
        placeholder="Alias simbólico"
        value={alias}
        onChangeText={setAlias}
        style={styles.input}
      />
      <Text>Arquetipo: {archetype}</Text>
      <Text>Reputación narrativa DAO: {reputation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: { borderWidth: 1, marginVertical: 8, padding: 4 },
});
