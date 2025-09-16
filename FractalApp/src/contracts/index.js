import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/eth');

export const FRACTAL_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';
export const SYMBOLIC_EVENT_LOG_ADDRESS = '0x0000000000000000000000000000000000000000';
export const FRACTAL_STAKING_ADDRESS = '0x0000000000000000000000000000000000000000';

const fractalTokenAbi = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const eventLogAbi = [
  'function getEvents() view returns (tuple(uint256 id,string purpose,string archetype,string hash,uint256 date)[])'
];

const stakingAbi = [
  'function stake(uint256 amount,string purpose) returns (bool)',
  'function getStakes(address owner) view returns (tuple(uint256 amount,string purpose,uint256 date)[])'
];

export function fractalTokenContract(signer) {
  return new ethers.Contract(FRACTAL_TOKEN_ADDRESS, fractalTokenAbi, signer || provider);
}

export function eventLogContract(signer) {
  return new ethers.Contract(SYMBOLIC_EVENT_LOG_ADDRESS, eventLogAbi, signer || provider);
}

export function stakingContract(signer) {
  return new ethers.Contract(FRACTAL_STAKING_ADDRESS, stakingAbi, signer || provider);
}
