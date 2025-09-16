import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { getProvider, getDAOContract } from '../lib/rpc';

// Display a proposal with ability to vote true or false
export default function ProposalCard({ proposal, refresh }) {
  async function vote(value) {
    try {
      const dao = getDAOContract(getProvider());
      const signer = getProvider().getSigner();
      const tx = await dao.connect(signer).emitirVoto(proposal.id, value);
      await tx.wait();
      refresh();
    } catch (err) {
      console.warn(err);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{proposal.texto}</Text>
      <Text>Votos: {proposal.votos}</Text>
      <Button title="A favor" onPress={() => vote(true)} />
      <Button title="En contra" onPress={() => vote(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  title: {
    fontWeight: 'bold',
  },
});
