// fund_bondingcurve.js — Deposit CAT into BondingCurveMarket
// CAT-only strategy: no ETH needed for initial liquidity
// BELL 13450.50

const hre = require("hardhat");
const { ethers } = hre;

const CAT_ADDRESS = "0xcf0440fAB2cfF8D7c885a292FB8A7b94643a1F80";
const MARKET_ADDRESS = "0x5188da061eF4aBb83C0EdfbA0577D9a2dd147688";
const CAT_TO_DEPOSIT = ethers.parseUnits("1000000", 18); // 1M CAT initial

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`Deployer: ${signer.address}`);
  console.log(`ETH: ${ethers.formatEther(await ethers.provider.getBalance(signer.address))} ETH`);

  // Use fully qualified name to avoid IERC20 artifact conflict
  const cat = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", CAT_ADDRESS, signer);
  const catBal = await cat.balanceOf(signer.address);
  console.log(`CAT balance: ${ethers.formatUnits(catBal, 18)} CAT`);

  if (catBal < CAT_TO_DEPOSIT) {
    console.log(`\nNot enough CAT! Have ${ethers.formatUnits(catBal, 18)}, need ${ethers.formatUnits(CAT_TO_DEPOSIT, 18)}`);
    process.exit(1);
  }

  // 1. Approve
  console.log(`\n1. Approving ${ethers.formatUnits(CAT_TO_DEPOSIT, 18)} CAT...`);
  const tx1 = await cat.approve(MARKET_ADDRESS, CAT_TO_DEPOSIT);
  await tx1.wait();
  console.log(`   Done: ${tx1.hash}`);

  // 2. Deposit
  console.log(`\n2. Depositing into market...`);
  const market = await ethers.getContractAt("BondingCurveMarket", MARKET_ADDRESS, signer);
  const tx2 = await market.depositCAT(CAT_TO_DEPOSIT);
  await tx2.wait();
  console.log(`   Done: ${tx2.hash}`);

  // 3. Verify
  const marketCatBal = await cat.balanceOf(MARKET_ADDRESS);
  console.log(`\n=== MARKET LIVE ===`);
  console.log(`Market CAT: ${ethers.formatUnits(marketCatBal, 18)} CAT`);
  console.log(`BaseScan:   https://basescan.org/address/${MARKET_ADDRESS}`);
  console.log(`Buy CAT: send ETH to ${MARKET_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
