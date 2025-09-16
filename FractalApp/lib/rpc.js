import { ethers } from 'ethers';
import { contracts } from "./contractInterfaces";
import * as SecureStore from 'expo-secure-store';

// RPC configuration. Change to your desired network endpoint.
export const RPC_URL = 'https://rpc.sepolia.org';

let provider;
export function getProvider() {
  if (!provider) {
    provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  }
  return provider;
}

// Example helper to load a private key from secure storage and create a signer
export async function getSigner() {
  const pk = await SecureStore.getItemAsync('privateKey');
  if (!pk) throw new Error('No private key stored');
  return new ethers.Wallet(pk, getProvider());
}

// Use signer: const contract = new ethers.Contract(addr, abi, signer);
export function getTokenContract(prov = getProvider()) {
  const { address, abi } = contracts.FRT || { address: '0xTOKEN_ADDRESS', abi: [] };
  return new ethers.Contract(address, abi, prov);
}

export function getDAOContract(prov = getProvider()) {
  const { address, abi } = contracts.DAO || { address: '0xDAO_ADDRESS', abi: [] };
  return new ethers.Contract(address, abi, prov);
}

// Add references to other contracts in contractInterfaces.js
