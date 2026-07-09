// check_sepolia.js — Check Sepolia balance
require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  const rpc = process.env.SEPOLIA_RPC_URL;
  const deployer = process.env.DEPLOYER_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;

  console.log("RPC URL:", rpc);
  console.log("Deployer:", deployer);
  console.log("Private Key:", privateKey ? `0x...${privateKey.slice(-4)} (${privateKey.length} chars)` : "NOT SET");

  const provider = new ethers.JsonRpcProvider(rpc);
  const bal = await provider.getBalance(deployer);
  console.log(`\nSepolia ETH Balance: ${ethers.formatEther(bal)} ETH`);

  const network = await provider.getNetwork();
  console.log(`Network: chainId=${Number(network.chainId)}`);

  // Gas estimate
  const gasPrice = await provider.getFeeData();
  console.log(`Gas price: ${ethers.formatUnits(gasPrice.gasPrice || 0n, "gwei")} gwei`);

  // Estimate deploy cost
  // Rough: ~30 contracts x ~500k gas each = ~15M gas
  const estimatedGas = 15_000_000n;
  const estimatedCost = estimatedGas * (gasPrice.gasPrice || ethers.parseUnits("10", "gwei"));
  console.log(`\nEstimated deploy cost (30 contracts): ${ethers.formatEther(estimatedCost)} ETH`);
  console.log(`Sufficient balance: ${bal > estimatedCost ? "YES" : "NO - need more ETH"}`);

  if (bal < estimatedCost) {
    console.log(`\nGet Sepolia ETH: https://sepoliafaucet.com`);
    console.log(`Or: https://cloud.google.com/application/web3/faucet/ethereum/sepolia`);
    console.log(`Send to: ${deployer}`);
  }
}

main().catch(console.error);
