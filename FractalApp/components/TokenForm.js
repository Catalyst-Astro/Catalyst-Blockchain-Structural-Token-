import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { getProvider, getTokenContract } from '../lib/rpc';

// TokenForm handles minting, transferring or viewing history based on props.type
export default function TokenForm({ route }) {
  const { type } = route.params;
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  async function submit() {
    try {
      const provider = getProvider();
      const token = getTokenContract(provider);
      const signer = provider.getSigner();
      // Signing transaction with ethers.js using the connected signer
      if (type === 'mint') {
        // Only contract owner can call mint
        const tx = await token.connect(signer).mint(to, amount);
        await tx.wait();
      } else if (type === 'transfer') {
        const tx = await token.connect(signer).transfer(to, amount);
        await tx.wait();
      }
    } catch (err) {
      console.warn(err);
    }
  }

  if (type === 'history') {
    // Placeholder for history using getPastEvents equivalent
    return (
      <View style={styles.container}>
        <Text>Historial de transferencias</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput placeholder="Destino" value={to} onChangeText={setTo} style={styles.input} />
      <TextInput placeholder="Cantidad" value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} />
      <Button title="Enviar" onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    marginBottom: 12,
    padding: 8,
  },
});
