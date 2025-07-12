interface NetworkConfig {
  name: string;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: string;
  bridgeAmount: string;
  transferFee: number;
  operationFee: string;
}

const configs: { [key: string]: NetworkConfig } = {
  // Arbitrum Networks
  arbitrumOne: {
    name: "Arbitrum One",
    tokenName: "Merlin Token",
    tokenSymbol: "MRLN",
    totalSupply: "800000000",
    bridgeAmount: "100000000",
    transferFee: 100,
    operationFee: "1"
  },
  arbitrumSepolia: {
    name: "Arbitrum Sepolia",
    tokenName: "Merlin Token",
    tokenSymbol: "MRLN",
    totalSupply: "800000000",
    bridgeAmount: "100000000",
    transferFee: 100,
    operationFee: "1"
  },
  // Base Networks
  base: {
    name: "Base",
    tokenName: "Merlin Token",
    tokenSymbol: "MRLN",
    totalSupply: "800000000",
    bridgeAmount: "100000000",
    transferFee: 100,
    operationFee: "1"
  },
  baseSepolia: {
    name: "Base Sepolia",
    tokenName: "Merlin Token",
    tokenSymbol: "MRLN",
    totalSupply: "800000000",
    bridgeAmount: "100000000",
    transferFee: 100,
    operationFee: "1"
  },
  // Optimism Networks
  optimism: {
    name: "Optimism",
    tokenName: "Merlin Token",
    tokenSymbol: "MRLN",
    totalSupply: "800000000",
    bridgeAmount: "100000000",
    transferFee: 100,
    operationFee: "1"
  },
  optimismSepolia: {
    name: "Optimism Sepolia",
    tokenName: "Merlin Token",
    tokenSymbol: "MRLN",
    totalSupply: "800000000",
    bridgeAmount: "100000000",
    transferFee: 100,
    operationFee: "1"
  },
  // Linea Networks
  linea: {
    name: "Linea",
    tokenName: "Merlin Token",
    tokenSymbol: "MRLN",
    totalSupply: "800000000",
    bridgeAmount: "100000000",
    transferFee: 100,
    operationFee: "1"
  },
  lineaTestnet: {
    name: "Linea Sepolia",
    tokenName: "Merlin Token",
    tokenSymbol: "MRLN",
    totalSupply: "800000000",
    bridgeAmount: "100000000",
    transferFee: 100,
    operationFee: "1"
  },
  // BSC Networks
  bsc: {
    name: "BNB Chain",
    tokenName: "Merlin Token",
    tokenSymbol: "MRLN",
    totalSupply: "800000000",
    bridgeAmount: "100000000",
    transferFee: 100,
    operationFee: "1"
  },
  bscTestnet: {
    name: "BSC Testnet",
    tokenName: "Merlin Token",
    tokenSymbol: "MRLN",
    totalSupply: "800000000",
    bridgeAmount: "100000000",
    transferFee: 100,
    operationFee: "1"
  }
};

export function getNetworkConfig(networkName: string): NetworkConfig {
  const config = configs[networkName];
  if (!config) {
    throw new Error(`No configuration found for network: ${networkName}`);
  }
  return config;
} 