import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getProvider } from '../lib/rpc';
import { contracts } from '../lib/contractInterfaces';
import { ethers } from 'ethers';

// Executes functions of a selected contract dynamically using ethers.js
export default function ContractExecutor({ contractName }) {
  const contractInfo = contracts[contractName];
  const [func, setFunc] = useState('');
  const [params, setParams] = useState('');

  async function execute() {
    try {
      const provider = getProvider();
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, signer);
      const args = params ? params.split(',').map(p => p.trim()) : [];
      const tx = await contract[func](...args);
      await tx.wait();
    } catch (err) {
      console.warn(err);
    }
  }

  return (
    <View style={styles.container}>
      <Picker selectedValue={func} onValueChange={setFunc}>
        {Object.keys(contractInfo.interface.functions).map(f => (
          <Picker.Item key={f} label={f} value={f} />
        ))}
      </Picker>
      <TextInput
        placeholder="Parámetros separados por coma"
        value={params}
        onChangeText={setParams}
        style={styles.input}
      />
      <Button title="Ejecutar" onPress={execute} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 10 },
  input: { borderWidth: 1, marginVertical: 8, padding: 4 },
});
