const { ethers } = require('ethers');

// Example environment variables
const MAINNET_RPC = process.env.MAINNET_RPC_URL;
const SIDECHAIN_RPC = process.env.SIDECHAIN_RPC_URL;
const BRIDGE_PRIVATE_KEY = process.env.BRIDGE_PRIVATE_KEY;

const bridgeVaultAddress = process.env.VAULT_ADDRESS;
const wrappedFRTAddress = process.env.WRAPPED_ADDRESS;
const destChainName = process.env.DEST_CHAIN_NAME || 'Polygon';

const vaultAbi = [
  'event TokensLocked(address indexed user, string destChain, uint256 amount, bytes32 lockId)'
];

const wrappedAbi = [
  'function mintWrappedFRT(address to, uint256 amount) external'
];

async function main() {
  const mainProvider = new ethers.providers.JsonRpcProvider(MAINNET_RPC);
  const sideProvider = new ethers.providers.JsonRpcProvider(SIDECHAIN_RPC);

  const signer = new ethers.Wallet(BRIDGE_PRIVATE_KEY, sideProvider);
  const vault = new ethers.Contract(bridgeVaultAddress, vaultAbi, mainProvider);
  const wrapped = new ethers.Contract(wrappedFRTAddress, wrappedAbi, signer);

  console.log('Listening for lock events...');
  vault.on('TokensLocked', async (user, destChain, amount) => {
    if (destChain !== destChainName) return;
    try {
      const tx = await wrapped.mintWrappedFRT(user, amount);
      await tx.wait();
      console.log(`Minted ${ethers.utils.formatUnits(amount, 18)} wFRT to ${user}`);
    } catch (err) {
      console.error('Mint failed', err);
    }
  });
}

main().catch(console.error);
