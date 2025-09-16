import React, { useEffect, useState } from 'react';
import { View, Text, Button, TextInput, FlatList, StyleSheet } from 'react-native';
import { getProvider, getDAOContract } from '../lib/rpc';
import ProposalCard from '../components/ProposalCard';

export default function DAOScreen() {
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [proposals, setProposals] = useState([]);

  async function loadProposals() {
    const dao = getDAOContract(getProvider());
    // Replace with actual call to list active proposals
    // Example: const list = await dao.getActiveProposals();
    const list = [];
    setProposals(list);
  }

  async function createProposal() {
    try {
      const dao = getDAOContract(getProvider());
      const signer = getProvider().getSigner();
      const tx = await dao.connect(signer).proponer(description, duration);
      await tx.wait();
      loadProposals();
    } catch (err) {
      console.warn(err);
    }
  }

  useEffect(() => {
    loadProposals();
  }, []);

  return (
    <View style={styles.container}>
      <TextInput placeholder="Descripción" value={description} onChangeText={setDescription} style={styles.input} />
      <TextInput placeholder="Duración" value={duration} onChangeText={setDuration} keyboardType="numeric" style={styles.input} />
      <Button title="Crear Propuesta" onPress={createProposal} />
      <FlatList
        data={proposals}
        keyExtractor={(item, idx) => idx.toString()}
        renderItem={({ item }) => <ProposalCard proposal={item} refresh={loadProposals} />}
      />
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
