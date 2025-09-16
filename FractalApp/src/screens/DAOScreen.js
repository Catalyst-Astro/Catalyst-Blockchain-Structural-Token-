import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity } from 'react-native';

export default function DAOScreen() {
  const [proposal, setProposal] = useState('');
  const [proposals, setProposals] = useState([]);
  const [result, setResult] = useState('');

  const createProposal = () => {
    setProposals([...proposals, { text: proposal, votes: 0 }]);
    setProposal('');
  };

  const vote = (index) => {
    const newP = [...proposals];
    newP[index].votes += 1;
    setProposals(newP);
  };

  useEffect(() => {
    // TODO: load proposals and results from smart contract
  }, []);

  return (
    <View className="p-4 space-y-3">
      <Text className="text-lg font-bold">Crear propuesta</Text>
      <TextInput value={proposal} onChangeText={setProposal} className="border p-2" />
      <Button title="Crear" onPress={createProposal} />

      <Text className="text-lg font-bold mt-6">Propuestas</Text>
      <FlatList
        data={proposals}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View className="py-2 border-b border-gray-200">
            <Text>{item.text}</Text>
            <TouchableOpacity onPress={() => vote(index)} className="mt-1">
              <Text className="text-blue-500">Votar ({item.votes})</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Text className="text-lg font-bold mt-6">Resultado narrativo</Text>
      <Text>{result}</Text>
    </View>
  );
}
