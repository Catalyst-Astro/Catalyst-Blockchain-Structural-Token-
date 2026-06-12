import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

// Local networks (hardhat, localhost) use Hardhat's built-in accounts.
// For remote networks (sepolia, holesky), PRIVATE_KEY must be set in .env.
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || "";
const MAINNET_RPC = process.env.MAINNET_RPC_URL || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  paths: {
    sources: "contracts",
    artifacts: "artifacts",
  },
  networks: {
    // Local Hardhat node (npx hardhat node) — pre-funded accounts
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Ephemeral local network (created/destroyed with each command)
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 0,
      },
    },
    // Sepolia testnet (requires PRIVATE_KEY and SEPOLIA_RPC_URL in .env)
    sepolia: {
      url: SEPOLIA_RPC || "https://sepolia.gateway.tenderly.co",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    // Holesky testnet
    holesky: {
      url: process.env.HOLESKY_RPC_URL || "https://holesky.gateway.tenderly.co",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 17000,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};

export default config;
