import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';

export default function ProfileScreen() {
  const [node, setNode] = useState({ archetype: '', events: [], reputation: 0 });

  useEffect(() => {
    // TODO: load nodeDAO data from contracts
  }, []);

  return (
    <View className="p-4">
      <Text className="text-lg font-bold">NodoDAO</Text>
      <Text>Arquetipo: {node.archetype}</Text>
      <Text>Reputación: {node.reputation}</Text>
      <Text className="mt-4 font-bold">Eventos participados</Text>
      <FlatList
        data={node.events}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <Text>- {item}</Text>}
      />
    </View>
  );
}
