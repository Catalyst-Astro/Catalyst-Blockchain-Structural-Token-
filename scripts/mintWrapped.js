const { ethers } = require('ethers');

const SIDECHAIN_RPC = process.env.SIDECHAIN_RPC_URL;
const BRIDGE_PRIVATE_KEY = process.env.BRIDGE_PRIVATE_KEY;
const wrappedFRTAddress = process.env.WRAPPED_ADDRESS;

const wrappedAbi = [
  'function mintWrappedFRT(address to, uint256 amount) external'
];

async function mint(to, amount) {
  const provider = new ethers.providers.JsonRpcProvider(SIDECHAIN_RPC);
  const signer = new ethers.Wallet(BRIDGE_PRIVATE_KEY, provider);
  const wrapped = new ethers.Contract(wrappedFRTAddress, wrappedAbi, signer);
  const tx = await wrapped.mintWrappedFRT(to, amount);
  await tx.wait();
  console.log(`Minted ${ethers.utils.formatUnits(amount, 18)} wFRT to ${to}`);
}

const [,,to, amt] = process.argv;
if(!to || !amt) {
  console.error('Usage: node mintWrapped.js <to> <amount>');
  process.exit(1);
}

mint(to, ethers.utils.parseUnits(amt, 18)).catch(console.error);
