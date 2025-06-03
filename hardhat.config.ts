import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000";
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY || "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
const OPTIMISTIC_API_KEY = process.env.OPTIMISTIC_API_KEY || "";
const LINEASCAN_API_KEY = process.env.LINEASCAN_API_KEY || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

// Get RPC URLs from environment variables
const BSC_RPC_URL = process.env.BSC_RPC_URL;
const BASE_RPC_URL = process.env.BASE_RPC_URL;
const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL;
const OPTIMISM_RPC_URL = process.env.OPTIMISM_RPC_URL;
const LINEA_RPC_URL = process.env.LINEA_RPC_URL;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    // BNB Chain Networks
    bsc: {
      url: BSC_RPC_URL || "https://bsc-dataseed1.binance.org",
      chainId: 56,
      accounts: [PRIVATE_KEY],
      timeout: 60000,
      gasMultiplier: 1.2
    },
    bscTestnet: {
      url:  BSC_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: [PRIVATE_KEY],
      gasMultiplier: 1.2
    },
    // Arbitrum Networks
    arbitrumOne: {
      url: ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: [PRIVATE_KEY]
    },
    arbitrumSepolia: {
      url:  ARBITRUM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: [PRIVATE_KEY]
    },
    // Base Networks
    base: {
      url: BASE_RPC_URL || "https://mainnet.base.org",
      chainId: 8453,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto"
    },
    baseSepolia: {
      url: BASE_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: [PRIVATE_KEY]
    },
    // Optimism Networks
    optimism: {
      url: OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      chainId: 10,
      accounts: [PRIVATE_KEY]
    },
    optimismSepolia: {
      url: OPTIMISM_RPC_URL ||"https://sepolia.optimism.io",
      chainId: 11155420,
      accounts: [PRIVATE_KEY]
    },
    // Linea Networks
    linea: {
      url: LINEA_RPC_URL || "https://rpc.linea.build",
      chainId: 59144,
      accounts: [PRIVATE_KEY]
    },
    lineaTestnet: {
      url: LINEA_RPC_URL ||"https://rpc.sepolia.linea.build",
      chainId: 59141,
      accounts: [PRIVATE_KEY]
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  },
  etherscan: {
    apiKey: {
      bsc: BSCSCAN_API_KEY,
      bscTestnet: BSCSCAN_API_KEY,
      arbitrumOne: ARBISCAN_API_KEY,
      arbitrumSepolia: ARBISCAN_API_KEY,
      base: BASESCAN_API_KEY,
      baseSepolia: BASESCAN_API_KEY,
      optimisticEthereum: OPTIMISTIC_API_KEY,
      optimismSepolia: OPTIMISTIC_API_KEY,
      linea: LINEASCAN_API_KEY,
      lineaTestnet: LINEASCAN_API_KEY
    },
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io"
        }
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      },
      {
        network: "optimismSepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimistic.etherscan.io"
        }
      },
      {
        network: "lineaTestnet",
        chainId: 59141,
        urls: {
          apiURL: "https://api-testnet.lineascan.build/api",
          browserURL: "https://sepolia.lineascan.build"
        }
      }
    ]
  }
};

export default config;
