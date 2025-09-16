import React, { useState } from 'react';
import { View, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import ContractExecutor from '../components/ContractExecutor';
import { contracts } from '../lib/contractInterfaces';

// Screen to select a contract and execute functions dynamically
export default function ContractsScreen() {
  const [selected, setSelected] = useState(Object.keys(contracts)[0]);

  return (
    <View style={styles.container}>
      <Picker selectedValue={selected} onValueChange={setSelected}>
        {Object.keys(contracts).map(key => (
          <Picker.Item key={key} label={key} value={key} />
        ))}
      </Picker>
      <ContractExecutor contractName={selected} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
