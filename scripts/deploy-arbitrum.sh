#!/bin/bash

# Check if we have enough arguments
if [ "$#" -lt 2 ]; then
    echo "Usage: ./deploy-arbitrum.sh <deployment-type> <network> [wait-confirmations]"
    echo "  deployment-type: bridge | dao"
    echo "  network: arbitrumOne | arbitrumGoerli | arbitrumSepolia"
    echo "  wait-confirmations: (optional) time in seconds to wait for confirmations (default: 60)"
    exit 1
fi

# Set variables
DEPLOY_TYPE=$1
NETWORK=$2
WAIT_CONFIRMATIONS=${3:-60}

# Validate deployment type
if [ "$DEPLOY_TYPE" != "bridge" ] && [ "$DEPLOY_TYPE" != "dao" ]; then
    echo "Error: deployment-type must be either 'bridge' or 'dao'"
    exit 1
fi

# Validate network
if [ "$NETWORK" != "arbitrumOne" ] && [ "$NETWORK" != "arbitrumGoerli" ] && [ "$NETWORK" != "arbitrumSepolia" ]; then
    echo "Error: network must be one of: arbitrumOne, arbitrumGoerli, arbitrumSepolia"
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

if [ -z "$ARBISCAN_API_KEY" ]; then
    echo "Warning: ARBISCAN_API_KEY not found in .env file. Contract verification will not work."
fi

# Set confirmation wait time as environment variable
export WAIT_CONFIRMATIONS=$WAIT_CONFIRMATIONS

# Execute deployment
echo "Deploying $DEPLOY_TYPE contracts to $NETWORK..."
DEPLOY_TYPE=$DEPLOY_TYPE npx hardhat run scripts/deploy-unified.ts --network $NETWORK

# Success message
echo "Deployment complete!"
echo "Make sure to save the contract addresses displayed above." 