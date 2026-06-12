// =============================================================================
// blockchain.js — Conector de Catalyst Studio a smart contracts
// =============================================================================
// Soporta: Hardhat local (chainId 31337) y Sepolia testnet (chainId 11155111)
// =============================================================================

import { ethers } from 'ethers';
import contracts from './contracts.json';

// ── ABIs mínimos (expandir según necesidad) ──
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address,uint256) returns (bool)',
  'function mintInflation()',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

const CATALYST_TOKEN_ABI = [
  ...ERC20_ABI,
  'function mintInflation()',
  'function lastMintTimestamp() view returns (uint256)',
  'function rewards(address) view returns (uint256)',
];

const TREASURY_ABI = [
  'function depositERC20(address token, uint256 amount)',
  'function withdrawETH(address payable to, uint256 amount, string calldata refCode)',
  'function withdrawERC20(address token, address to, uint256 amount, string calldata refCode)',
  'function allowedAsset(address) view returns (bool)',
  'event Deposited(address indexed asset, address indexed from, uint256 amount)',
  'event Withdrawn(address indexed asset, address indexed to, uint256 amount, string refCode)',
];

const DAO_ABI = [
  'function propose(string calldata description, address[] calldata targets, uint256[] calldata values, bytes[] calldata calldatas) returns (uint256)',
  'function castVote(uint256 proposalId, bool support)',
  'function execute(uint256 proposalId)',
  'function quorum() view returns (uint256)',
  'function votingPeriod() view returns (uint256)',
  'event ProposalCreated(uint256 indexed proposalId, address proposer, string description)',
];

const WHITELIST_ABI = [
  'function isWhitelisted(address) view returns (bool)',
  'function addToWhitelist(address)',
  'function removeFromWhitelist(address)',
];

// ── Conexión ──
let provider = null;
let signer = null;
let chainId = null;

const RPC_URLS = {
  31337: 'http://127.0.0.1:8545',
  11155111: 'https://sepolia.gateway.tenderly.co',
  17000: 'https://holesky.gateway.tenderly.co',
};

// Configuración de red Catalyst Local para MetaMask
const CATALYST_LOCAL = {
  chainId: '0x7A69', // 31337 en hex
  chainName: 'Catalyst Local (Hardhat)',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['http://127.0.0.1:8545'],
  blockExplorerUrls: null,
};

export async function connectBlockchain(rpcUrl = 'http://127.0.0.1:8545') {
  provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  chainId = Number(network.chainId);
  console.log(`[Blockchain] Connected to chain ${chainId}`);
  return { chainId, provider };
}

export async function connectWallet() {
  // ── MetaMask / Browser Wallet ──
  if (window.ethereum) {
    try {
      // Solicitar cambio a red local Catalyst (o agregarla si no existe)
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7A69' }], // 31337
        });
      } catch (switchError) {
        // Si la red no existe, agregarla
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CATALYST_LOCAL],
          });
        }
      }

      // Solicitar cuentas
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      signer = await browserProvider.getSigner();
      const address = await signer.getAddress();
      const balance = ethers.formatEther(await browserProvider.getBalance(address));
      console.log('[Blockchain] MetaMask wallet connected:', address);
      return { address, balance, walletType: 'MetaMask' };
    } catch (err) {
      console.warn('[Blockchain] MetaMask fallback, usando Hardhat local:', err.message);
    }
  }

  // ── Fallback: Use PRIVATE_KEY from env or prompt ──
  if (!window.ethereum) {
    // WARNING: Never hardcode private keys in source code.
    // Set VITE_PRIVATE_KEY in your .env file for development, or use MetaMask.
    const envKey = import.meta.env.VITE_PRIVATE_KEY;
    if (!envKey) {
      throw new Error(
        'No wallet available. Install MetaMask or set VITE_PRIVATE_KEY in .env for local development.'
      );
    }
    const wallet = new ethers.Wallet(envKey, provider);
    signer = wallet;
    console.log('[Blockchain] Development wallet connected:', wallet.address);
    return {
      address: wallet.address,
      balance: ethers.formatEther(await provider.getBalance(wallet.address)),
      walletType: 'DevWallet',
    };
  }
}

// ── Contratos ──
function getAddress(name) {
  const entry = contracts.find((c) => c.name === name);
  if (!entry) throw new Error(`Contract ${name} not found in contracts.json`);
  return entry.address;
}

function getContract(name, abi) {
  if (!provider) throw new Error('Not connected. Call connectBlockchain() first.');
  const addr = getAddress(name);
  return new ethers.Contract(addr, abi, signer || provider);
}

export function getCatalystToken() {
  return getContract('CatalystToken', CATALYST_TOKEN_ABI);
}

export function getTreasury() {
  return getContract('Treasury', TREASURY_ABI);
}

export function getFractalDAO() {
  return getContract('FractalDAO', DAO_ABI);
}

export function getWhitelistRegistry() {
  return getContract('WhitelistRegistry', WHITELIST_ABI);
}

export function getAllContracts() {
  return contracts;
}

// ── Acciones de alto nivel ──

export async function deployToken(name, symbol, initialSupply, decimals = 18) {
  if (!signer) throw new Error('Connect wallet first');
  const factory = new ethers.ContractFactory(
    ['constructor(string,string,uint256,uint256)'],
    '0x' // bytecode not needed when using existing contract
  );
  // Usar el token existente como factory para nuevos tokens
  const catToken = getAddress('CatalystToken');
  console.log(`[Blockchain] Deploying ${name} (${symbol}) with supply ${initialSupply}`);
  // Mock: en producción, esto desplegaría un nuevo CatalystToken
  return {
    name,
    symbol,
    address: catToken,
    txHash: '0x' + Math.random().toString(16).slice(2, 34),
    supply: initialSupply,
  };
}

export async function getTokenBalance(address) {
  try {
    const token = getCatalystToken();
    const balance = await token.balanceOf(address);
    return ethers.formatEther(balance);
  } catch {
    return '0';
  }
}

export async function getTokenInfo() {
  try {
    const token = getCatalystToken();
    const [name, symbol, totalSupply, decimals] = await Promise.all([
      token.name(),
      token.symbol(),
      token.totalSupply(),
      token.decimals(),
    ]);
    return {
      name,
      symbol,
      totalSupply: ethers.formatEther(totalSupply),
      decimals: Number(decimals),
    };
  } catch (e) {
    return { name: 'N/A', symbol: 'N/A', totalSupply: '0', decimals: 18, error: e.message };
  }
}

export async function executeGovernance(action) {
  if (!signer) throw new Error('Connect wallet first');
  const dao = getFractalDAO();
  console.log(`[Blockchain] Governance action: ${action}`);
  // Mock execution — expand with real DAO calls
  return { action, timestamp: new Date().toISOString(), status: 'executed' };
}

export { provider, signer, chainId };
