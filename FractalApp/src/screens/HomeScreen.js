import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { fractalTokenContract } from '../contracts';
import { ethers } from 'ethers';

export default function HomeScreen() {
  const [balance, setBalance] = useState('0');
  const [reputation, setReputation] = useState('0');
  const [glyph, setGlyph] = useState('');
  const [cycle, setCycle] = useState('0');

  useEffect(() => {
    async function load() {
      // Example using default provider; replace with wallet connection
      const contract = fractalTokenContract();
      const addr = ethers.ZeroAddress;
      const bal = await contract.balanceOf(addr);
      setBalance(bal.toString());
      // TODO: fetch reputation, glyph and cycle from appropriate contracts
    }
    load();
  }, []);

  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-xl font-bold">Saldo FRT: {balance}</Text>
      <Text className="mt-2">Reputación: {reputation}</Text>
      <Text>Glifo: {glyph}</Text>
      <Text className="mt-2">Último ciclo DAO: {cycle}</Text>
    </View>
  );
}
