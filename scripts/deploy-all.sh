#!/bin/bash

# Check if we have enough arguments
if [ "$#" -lt 1 ]; then
    echo "Usage: ./deploy-all.sh <network> [wait-confirmations]"
    echo "  network: arbitrumOne | arbitrumGoerli | arbitrumSepolia"
    echo "  wait-confirmations: (optional) time in seconds to wait for confirmations (default: 60)"
    exit 1
fi

# Set variables
NETWORK=$1
WAIT_CONFIRMATIONS=${2:-60}

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
echo "Deploying all contracts (Bridge + DAO) to $NETWORK..."
npx hardhat run scripts/deploy-all.ts --network $NETWORK

# Success message
echo "Deployment complete!"
echo "Make sure to save the contract addresses displayed above." 