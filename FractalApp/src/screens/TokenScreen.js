import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
import { fractalTokenContract, stakingContract } from '../contracts';
import { ethers } from 'ethers';

export default function TokenScreen() {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [stakePurpose, setStakePurpose] = useState('');
  const [history, setHistory] = useState([]);

  const send = async () => {
    const signer = new ethers.Wallet('0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    const contract = fractalTokenContract(signer);
    await contract.transfer(to, ethers.parseEther(amount));
  };

  const stake = async () => {
    const signer = new ethers.Wallet('0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    const contract = stakingContract(signer);
    await contract.stake(ethers.parseEther(amount), stakePurpose);
  };

  useEffect(() => {
    async function load() {
      const contract = stakingContract();
      const list = await contract.getStakes(ethers.ZeroAddress);
      setHistory(list);
    }
    load();
  }, []);

  return (
    <View className="p-4 space-y-3">
      <Text className="text-lg font-bold">Enviar FRT</Text>
      <TextInput placeholder="Destino" value={to} onChangeText={setTo} className="border p-2" />
      <TextInput placeholder="Cantidad" value={amount} onChangeText={setAmount} keyboardType="numeric" className="border p-2" />
      <Button title="Enviar" onPress={send} />

      <Text className="text-lg font-bold mt-6">Hacer Staking</Text>
      <TextInput placeholder="Propósito" value={stakePurpose} onChangeText={setStakePurpose} className="border p-2" />
      <Button title="Stake" onPress={stake} />

      <Text className="text-lg font-bold mt-6">Historial de staking</Text>
      <FlatList
        data={history}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View className="py-2 border-b border-gray-200">
            <Text>Cantidad: {String(item.amount)}</Text>
            <Text>Propósito: {item.purpose}</Text>
          </View>
        )}
      />
    </View>
  );
}
