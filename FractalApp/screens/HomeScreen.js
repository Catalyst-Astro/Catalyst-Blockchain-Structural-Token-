import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getProvider, getTokenContract } from '../lib/rpc';

// Home screen shows balances and the latest symbolic event.
export default function HomeScreen() {
  const [balance, setBalance] = useState('0');
  const [archetype, setArchetype] = useState('');
  const [reputation, setReputation] = useState('');
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const provider = getProvider();
        const token = getTokenContract(provider); // FRT token instance
        // Replace with the address of the connected wallet
        const addr = await provider.getSigner().getAddress();
        const bal = await token.balanceOf(addr);
        setBalance(bal.toString());
        // Load archetype, reputation and last event from your contracts
        // Using ethers.js contract calls
      } catch (err) {
        console.warn('Error fetching data', err);
      }
    }
    fetchData();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Saldo FRT: {balance}</Text>
      <Text style={styles.text}>Arquetipo: {archetype || 'desconocido'}</Text>
      <Text style={styles.text}>Reputación simbólica: {reputation}</Text>
      {lastEvent && (
        <Text style={styles.text}>
          Último evento: {lastEvent.type} {lastEvent.hash}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
  },
});
