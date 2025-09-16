import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { eventLogContract } from '../contracts';

export default function EventsScreen() {
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      const contract = eventLogContract();
      try {
        const ev = await contract.getEvents();
        setEvents(ev);
      } catch (e) {
        console.warn(e);
      }
    }
    load();
  }, []);

  if (selected) {
    return (
      <View className="p-4">
        <Text className="text-lg font-bold">Detalle del Evento</Text>
        <Text>Propósito: {selected.purpose}</Text>
        <Text>Arquetipo: {selected.archetype}</Text>
        <Text>Hash: {selected.hash}</Text>
        <Text>Fecha: {String(selected.date)}</Text>
        <TouchableOpacity onPress={() => setSelected(null)} className="mt-4">
          <Text className="text-blue-500">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => setSelected(item)} className="p-4 border-b border-gray-200">
          <Text className="font-bold">{item.purpose}</Text>
          <Text className="text-xs text-gray-500">{item.hash}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
