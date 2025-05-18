#!/bin/bash

# This script deploys bridge contracts to all supported L2 networks
# Usage: ./deploy-bridges.sh [mainnet|testnet|all]

# Default to testnet if no argument provided
DEPLOY_TARGET=${1:-testnet}

# Validate deployment target
if [ "$DEPLOY_TARGET" != "mainnet" ] && [ "$DEPLOY_TARGET" != "testnet" ] && [ "$DEPLOY_TARGET" != "all" ]; then
    echo "Error: Deployment target must be 'mainnet', 'testnet', or 'all'"
    echo "Usage: ./deploy-bridges.sh [mainnet|testnet|all]"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Please create an .env file with your private key and API keys"
    exit 1
fi

# Load environment variables
source .env

# Check for required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not found in .env file"
    exit 1
fi

# Function to deploy to a specific network
deploy_to_network() {
    NETWORK=$1
    NETWORK_NAME=$2
    API_KEY_VAR=$3
    
    # Check for the API key
    API_KEY_VALUE=${!API_KEY_VAR}
    if [ -z "$API_KEY_VALUE" ]; then
        echo "Warning: $API_KEY_VAR not found in .env file. Contract verification for $NETWORK_NAME will not work."
    fi
    
    echo "=========================================="
    echo "Deploying bridge contracts to $NETWORK_NAME..."
    echo "=========================================="
    DEPLOY_TYPE=bridge npx hardhat run scripts/deploy-unified.ts --network $NETWORK
    
    # Wait between deployments to avoid rate limiting
    echo "Waiting 10 seconds before proceeding to the next network..."
    sleep 10
}

# Mainnet deployments
deploy_mainnet() {
    # Arbitrum
    deploy_to_network "arbitrumOne" "Arbitrum One" "ARBISCAN_API_KEY"
    
    # Base
    deploy_to_network "base" "Base" "BASESCAN_API_KEY"
    
    # Optimism
    deploy_to_network "optimism" "Optimism" "OPTIMISTIC_API_KEY"
    
    # Linea
    deploy_to_network "linea" "Linea" "LINEASCAN_API_KEY"
    
    # BNB Chain
    deploy_to_network "bsc" "BNB Chain" "BSCSCAN_API_KEY"
}

# Testnet deployments
deploy_testnet() {
    # Arbitrum
    deploy_to_network "arbitrumSepolia" "Arbitrum Sepolia" "ARBISCAN_API_KEY"
    
    # Base
    deploy_to_network "baseSepolia" "Base Sepolia" "BASESCAN_API_KEY"
    
    # Optimism
    deploy_to_network "optimismSepolia" "Optimism Sepolia" "OPTIMISTIC_API_KEY"
    
    # Linea
    deploy_to_network "lineaTestnet" "Linea Sepolia" "LINEASCAN_API_KEY"
    
    # BNB Chain Testnet
    deploy_to_network "bscTestnet" "BSC Testnet" "BSCSCAN_API_KEY"
}

# Execute deployments based on target
case $DEPLOY_TARGET in
    "mainnet")
        echo "Starting mainnet bridge deployments..."
        deploy_mainnet
        ;;
    "testnet")
        echo "Starting testnet bridge deployments..."
        deploy_testnet
        ;;
    "all")
        echo "Starting all bridge deployments..."
        echo "Testnet deployments first..."
        deploy_testnet
        echo "Mainnet deployments next..."
        deploy_mainnet
        ;;
esac

echo "=========================================="
echo "All bridge deployments completed!"
echo "Make sure to save the contract addresses displayed above."
echo "==========================================" 