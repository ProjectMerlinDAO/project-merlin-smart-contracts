const { ethers } = require("hardhat");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

async function main() {
    console.log("🔍 Verifying BSC Contracts using BSCScan API...\n");

    // BSC Testnet deployed contract addresses
    const DEPLOYED_ADDRESSES = {
        ORACLE: "0x700E76C4DEE9aa1A36B2AC1aBe541615d42AAbb9",
        TOKEN_MANAGER: "0xa64D0bCB4b6325C1ed68749727eA544366cca30e",
        BRIDGE: "0xf42Bd569fffAE367716412D0C8d3605c204390c2"
    };

    // BSC Testnet API configuration
    const BSC_TESTNET_API_URL = "https://api-testnet.bscscan.com/api";
    const API_KEY = process.env.BSCSCAN_API_KEY;

    if (!API_KEY) {
        console.log("❌ BSCSCAN_API_KEY not found in .env file");
        console.log("Please add your BSCScan API key to verify contracts");
        return;
    }

    console.log("Using BSCScan API:", BSC_TESTNET_API_URL);
    console.log("API Key:", API_KEY.substring(0, 8) + "...");

    // Get deployer info
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);

    // Contract deployment parameters (from our deployment)
    const deploymentParams = {
        oracle: {
            name: "Oracle",
            constructorArgs: [deployer.address]
        },
        tokenManager: {
            name: "TokenManager", 
            constructorArgs: [
                "Merlin-97",  // tokenName
                "MRLN3714",  // tokenSymbol (with unique suffix)
                ethers.parseEther("800000000") // totalSupply
            ]
        },
        bridge: {
            name: "Bridge",
            constructorArgs: [
                DEPLOYED_ADDRESSES.TOKEN_MANAGER, // tokenAddress
                100,  // transferFee (1%)
                ethers.parseEther("1"), // operationFee
                DEPLOYED_ADDRESSES.ORACLE, // oracle
                deployer.address // offchainProcessor
            ]
        }
    };

    // Read contract source codes
    const contractSources = await getContractSources();

    // Verify each contract
    console.log("\n📋 Starting contract verification...\n");

    // 1. Verify Oracle
    await verifyContract(
        "Oracle",
        DEPLOYED_ADDRESSES.ORACLE,
        contractSources.Oracle,
        deploymentParams.oracle.constructorArgs,
        BSC_TESTNET_API_URL,
        API_KEY
    );

    // 2. Verify TokenManager
    await verifyContract(
        "TokenManager", 
        DEPLOYED_ADDRESSES.TOKEN_MANAGER,
        contractSources.TokenManager,
        deploymentParams.tokenManager.constructorArgs,
        BSC_TESTNET_API_URL,
        API_KEY
    );

    // 3. Verify Bridge
    await verifyContract(
        "Bridge",
        DEPLOYED_ADDRESSES.BRIDGE,
        contractSources.Bridge,
        deploymentParams.bridge.constructorArgs,
        BSC_TESTNET_API_URL,
        API_KEY
    );

    console.log("\n🎉 Contract verification process completed!");
    console.log("\n🔗 View verified contracts on BSCScan:");
    console.log(`- Oracle: https://testnet.bscscan.com/address/${DEPLOYED_ADDRESSES.ORACLE}#code`);
    console.log(`- TokenManager: https://testnet.bscscan.com/address/${DEPLOYED_ADDRESSES.TOKEN_MANAGER}#code`);
    console.log(`- Bridge: https://testnet.bscscan.com/address/${DEPLOYED_ADDRESSES.BRIDGE}#code`);
}

async function getContractSources() {
    console.log("📖 Reading contract source codes...");
    
    try {
        const oracleSource = fs.readFileSync("contracts/Oracle.sol", "utf8");
        const tokenManagerSource = fs.readFileSync("contracts/TokenManager.sol", "utf8");
        const bridgeSource = fs.readFileSync("contracts/Bridge.sol", "utf8");

        return {
            Oracle: oracleSource,
            TokenManager: tokenManagerSource,
            Bridge: bridgeSource
        };
    } catch (error) {
        console.error("❌ Error reading contract sources:", error.message);
        throw error;
    }
}

async function verifyContract(contractName, contractAddress, sourceCode, constructorArgs, apiUrl, apiKey) {
    console.log(`🔍 Verifying ${contractName} at ${contractAddress}...`);

    // Encode constructor arguments
    const encodedArgs = await encodeConstructorArgs(constructorArgs);
    console.log(`- Constructor args encoded: ${encodedArgs}`);

    // Prepare verification data
    const verificationData = {
        chainid: 97, // BSC Testnet
        module: "contract",
        action: "verifysourcecode",
        apikey: apiKey,
        contractaddress: contractAddress,
        sourceCode: sourceCode,
        codeformat: "solidity-single-file",
        contractname: contractName,
        compilerversion: "v0.8.19+commit.7dd6d404", // Update this to match your compiler version
        optimizationUsed: "1", // 1 for optimization enabled
        runs: "200", // Optimization runs
        constructorArguements: encodedArgs // Note: BSCScan uses this spelling
    };

    try {
        // Submit verification request
        const response = await axios.post(apiUrl, null, {
            params: verificationData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log(`- Response status: ${response.data.status}`);
        console.log(`- Response message: ${response.data.message}`);

        if (response.data.status === "1") {
            const guid = response.data.result;
            console.log(`✅ ${contractName} verification submitted successfully!`);
            console.log(`- GUID: ${guid}`);
            
            // Check verification status
            await checkVerificationStatus(contractName, guid, apiUrl, apiKey);
        } else {
            console.log(`❌ ${contractName} verification failed:`, response.data.result);
        }

    } catch (error) {
        console.error(`❌ Error verifying ${contractName}:`, error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }

    console.log(""); // Add spacing
}

async function checkVerificationStatus(contractName, guid, apiUrl, apiKey, maxAttempts = 10) {
    console.log(`⏳ Checking verification status for ${contractName}...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await axios.get(apiUrl, {
                params: {
                    chainid: 97,
                    module: "contract", 
                    action: "checkverifystatus",
                    guid: guid,
                    apikey: apiKey
                }
            });

            const result = response.data.result;
            console.log(`- Attempt ${attempt}: ${result}`);

            if (result.includes("Pass - Verified")) {
                console.log(`✅ ${contractName} verified successfully!`);
                return true;
            } else if (result.includes("Fail")) {
                console.log(`❌ ${contractName} verification failed: ${result}`);
                return false;
            }

            // Still pending, wait and retry
            if (attempt < maxAttempts) {
                console.log(`⏳ Still pending, waiting 10 seconds before retry...`);
                await delay(10000); // Wait 10 seconds
            }

        } catch (error) {
            console.error(`❌ Error checking status for ${contractName}:`, error.message);
        }
    }

    console.log(`⚠️ ${contractName} verification status check timed out`);
    return false;
}

async function encodeConstructorArgs(args) {
    if (!args || args.length === 0) {
        return "";
    }

    try {
        // Convert BigNumber objects to strings for encoding
        const processedArgs = args.map(arg => {
            if (typeof arg === 'object' && arg._isBigNumber) {
                return arg.toString();
            }
            return arg;
        });

        // Use ethers ABI coder to encode constructor arguments
        const abiCoder = ethers.AbiCoder.defaultAbiCoder();
        
        // We need to determine the types based on the arguments
        const types = processedArgs.map(arg => {
            if (typeof arg === 'string' && arg.startsWith('0x') && arg.length === 42) {
                return 'address';
            } else if (typeof arg === 'string' && /^\d+$/.test(arg)) {
                return 'uint256';
            } else if (typeof arg === 'number') {
                return 'uint256';
            } else if (typeof arg === 'string') {
                return 'string';
            } else {
                return 'uint256'; // Default fallback
            }
        });

        const encoded = abiCoder.encode(types, processedArgs);
        return encoded.slice(2); // Remove 0x prefix
    } catch (error) {
        console.error("Error encoding constructor arguments:", error);
        return "";
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to get compiler version from hardhat config
async function getCompilerVersion() {
    try {
        const hardhatConfig = require("../hardhat.config.ts");
        return hardhatConfig.solidity.version || "v0.8.19+commit.7dd6d404";
    } catch (error) {
        return "v0.8.19+commit.7dd6d404"; // Default fallback
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    }); 