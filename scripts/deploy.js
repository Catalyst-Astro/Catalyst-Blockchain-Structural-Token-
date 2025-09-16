const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const FractalToken = await hre.ethers.getContractFactory("FractalToken");
  const token = await FractalToken.deploy();
  await token.deployed();
  console.log("FractalToken deployed to:", token.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
