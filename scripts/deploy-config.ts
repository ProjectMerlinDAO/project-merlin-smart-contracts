// Network IDs for supported chains
export const NETWORK_IDS = {
  // Mainnets
  ETHEREUM: 1n,
  ARBITRUM: 42161n,
  BASE: 8453n,
  OPTIMISM: 10n,
  LINEA: 59144n,
  
  // Testnets
  GOERLI: 5n,
  SEPOLIA: 11155111n,
  ARBITRUM_GOERLI: 421613n,
  ARBITRUM_SEPOLIA: 421614n,
  BASE_GOERLI: 84531n,
  BASE_SEPOLIA: 84532n,
  OPTIMISM_GOERLI: 420n, 
  OPTIMISM_SEPOLIA: 11155420n,
  LINEA_GOERLI: 59140n,
  LINEA_TESTNET: 59141n, // Linea Sepolia
  
  // Development
  HARDHAT: 31337n,
  LOCALHOST: 31337n
};

// Configuration for each network
export const getNetworkConfig = (networkId: bigint) => {
  const configs: Record<string, any> = {
    // Mainnet configurations
    [NETWORK_IDS.ETHEREUM.toString()]: {
      name: 'Ethereum Mainnet',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '800000000', // 800 million
      bridgeAmount: '100000000', // 100 million
      transferFee: 100, // 1%
      operationFee: '1', // 1 MRLN
      explorerName: 'Etherscan',
      isProductionNetwork: true
    },
    [NETWORK_IDS.ARBITRUM.toString()]: {
      name: 'Arbitrum One',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '800000000',
      bridgeAmount: '100000000',
      transferFee: 100, // 1%
      operationFee: '1',
      explorerName: 'Arbiscan',
      isProductionNetwork: true
    },
    [NETWORK_IDS.BASE.toString()]: {
      name: 'Base',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '800000000',
      bridgeAmount: '100000000',
      transferFee: 100,
      operationFee: '1',
      explorerName: 'BaseScan',
      isProductionNetwork: true
    },
    [NETWORK_IDS.OPTIMISM.toString()]: {
      name: 'Optimism',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '800000000',
      bridgeAmount: '100000000',
      transferFee: 100,
      operationFee: '1',
      explorerName: 'Optimistic Etherscan',
      isProductionNetwork: true
    },
    [NETWORK_IDS.LINEA.toString()]: {
      name: 'Linea',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '800000000',
      bridgeAmount: '100000000',
      transferFee: 100,
      operationFee: '1',
      explorerName: 'LineaScan',
      isProductionNetwork: true
    },
    
    // Testnet configurations
    [NETWORK_IDS.ARBITRUM_GOERLI.toString()]: {
      name: 'Arbitrum Goerli',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '1000000', // 1 million for testnet
      bridgeAmount: '200000', // 200k for testnet
      transferFee: 100,
      operationFee: '1',
      explorerName: 'Arbiscan (Goerli)',
      isProductionNetwork: false
    },
    [NETWORK_IDS.ARBITRUM_SEPOLIA.toString()]: {
      name: 'Arbitrum Sepolia',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '1000000',
      bridgeAmount: '200000',
      transferFee: 100,
      operationFee: '1',
      explorerName: 'Arbiscan (Sepolia)',
      isProductionNetwork: false
    },
    [NETWORK_IDS.BASE_GOERLI.toString()]: {
      name: 'Base Goerli',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '1000000',
      bridgeAmount: '200000',
      transferFee: 100,
      operationFee: '1',
      explorerName: 'BaseScan (Goerli)',
      isProductionNetwork: false
    },
    [NETWORK_IDS.BASE_SEPOLIA.toString()]: {
      name: 'Base Sepolia',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '1000000',
      bridgeAmount: '200000',
      transferFee: 100,
      operationFee: '1',
      explorerName: 'BaseScan (Sepolia)',
      isProductionNetwork: false
    },
    [NETWORK_IDS.OPTIMISM_GOERLI.toString()]: {
      name: 'Optimism Goerli',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '1000000',
      bridgeAmount: '200000',
      transferFee: 100,
      operationFee: '1',
      explorerName: 'Optimistic Etherscan (Goerli)',
      isProductionNetwork: false
    },
    [NETWORK_IDS.OPTIMISM_SEPOLIA.toString()]: {
      name: 'Optimism Sepolia',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '1000000',
      bridgeAmount: '200000',
      transferFee: 100,
      operationFee: '1',
      explorerName: 'Optimistic Etherscan (Sepolia)',
      isProductionNetwork: false
    },
    [NETWORK_IDS.LINEA_GOERLI.toString()]: {
      name: 'Linea Goerli',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '1000000',
      bridgeAmount: '200000',
      transferFee: 100,
      operationFee: '1',
      explorerName: 'LineaScan (Goerli)',
      isProductionNetwork: false
    },
    [NETWORK_IDS.LINEA_TESTNET.toString()]: {
      name: 'Linea Sepolia',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '1000000',
      bridgeAmount: '200000',
      transferFee: 100,
      operationFee: '1',
      explorerName: 'LineaScan (Sepolia)',
      isProductionNetwork: false
    },
    
    // Development networks
    [NETWORK_IDS.HARDHAT.toString()]: {
      name: 'Hardhat Local',
      tokenName: 'Merlin',
      tokenSymbol: 'MRLN',
      totalSupply: '1000000',
      bridgeAmount: '200000',
      transferFee: 100,
      operationFee: '1',
      explorerName: 'None',
      isProductionNetwork: false
    }
  };

  // Return default local config if network not found
  const networkIdStr = networkId.toString();
  return configs[networkIdStr] || configs[NETWORK_IDS.HARDHAT.toString()];
}; 