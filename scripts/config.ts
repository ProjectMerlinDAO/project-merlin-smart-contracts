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
  arbitrumSepolia: {
    name: "Arbitrum Sepolia",
    tokenName: "Merlin",
    tokenSymbol: "MRLN",
    totalSupply: "800000000", // 800M tokens
    bridgeAmount: "100000000", // 100M tokens
    transferFee: 100, // 1% (100 basis points)
    operationFee: "1" // 1 MRLN
  },
  arbitrumOne: {
    name: "Arbitrum One",
    tokenName: "Merlin",
    tokenSymbol: "MRLN",
    totalSupply: "800000000",
    bridgeAmount: "100000000",
    transferFee: 100,
    operationFee: "1"
  },
  arbitrumGoerli: {
    name: "Arbitrum Goerli",
    tokenName: "Merlin",
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