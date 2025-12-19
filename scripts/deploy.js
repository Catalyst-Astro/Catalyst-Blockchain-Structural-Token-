const hre = require("hardhat");
require("dotenv").config();

const TOKEN_DECIMALS = 18;

function findArgValue(flags) {
  for (const flag of flags) {
    const index = process.argv.indexOf(flag);
    if (index !== -1 && index + 1 < process.argv.length) {
      return process.argv[index + 1];
    }
  }
  return undefined;
}

function getConfigValue(envKey, flags) {
  return findArgValue(flags) ?? process.env[envKey];
}

function requireValue(label, value, hint) {
  if (value === undefined || value === "") {
    const detail = hint ? ` ${hint}` : "";
    console.error(`Missing ${label}.${detail}`);
    process.exit(1);
  }
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(deployerBalance));

  const initialSupplyInput = getConfigValue("INITIAL_SUPPLY", [
    "--initial-supply",
    "--initialSupply",
  ]);
  requireValue(
    "INITIAL_SUPPLY",
    initialSupplyInput,
    "Set INITIAL_SUPPLY in .env or pass --initial-supply <amount>."
  );
  const initialSupply = hre.ethers.parseUnits(initialSupplyInput, TOKEN_DECIMALS);

  const FractalToken = await hre.ethers.getContractFactory("FractalToken");
  const token = await FractalToken.deploy(initialSupply);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("FractalToken deployed to:", tokenAddress);

  const deployDao = process.env.DEPLOY_DAO === "true" || hasFlag("--deploy-dao");
  const quorumInput = getConfigValue("QUORUM", ["--quorum"]);
  const votingPeriodInput = getConfigValue("VOTING_PERIOD", [
    "--voting-period",
    "--votingPeriod",
  ]);

  if (deployDao) {
    requireValue("QUORUM", quorumInput, "Set QUORUM in .env or pass --quorum <amount>.");
    requireValue(
      "VOTING_PERIOD",
      votingPeriodInput,
      "Set VOTING_PERIOD in .env or pass --voting-period <seconds>."
    );

    const quorum = hre.ethers.parseUnits(quorumInput, TOKEN_DECIMALS);
    const votingPeriod = BigInt(votingPeriodInput);
    const FractalDAO = await hre.ethers.getContractFactory("FractalDAO");
    const dao = await FractalDAO.deploy(tokenAddress, quorum, votingPeriod);
    await dao.waitForDeployment();
    console.log("FractalDAO deployed to:", await dao.getAddress());
  } else if (quorumInput || votingPeriodInput) {
    console.log("Skipping FractalDAO deployment. Set DEPLOY_DAO=true or pass --deploy-dao.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
