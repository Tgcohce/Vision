/**
 * This script generates a new Ethereum account for deployment on the Holesky testnet.
 * It uses ethers.js to create a random wallet and writes the deployer account address
 * and private key to a .env file in the backend directory.
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Generate a new random wallet
const wallet = ethers.Wallet.createRandom();

console.log("Deployer Account Address:", wallet.address);
console.log("Deployer Private Key:", wallet.privateKey);

// Define the .env file path in the backend folder
const envPath = path.join(__dirname, ".env");

// Create or update the .env file with the deployer details
const envContent = `
# Holesky Testnet Configuration
PROVIDER_URL=https://eth-holesky.g.alchemy.com/v2/q8kNZ8FF1Hb9rSYncRpvnJlNXkkchUMp
DEPLOYER_ACCOUNT=${wallet.address}
DEPLOYER_PRIVATE_KEY=${wallet.privateKey}
FRONTEND_URL=http://localhost:3001
MONITORING_PORT=3001
`;

// Write the environment variables to .env file
fs.writeFileSync(envPath, envContent.trim());

console.log(`.env file successfully written at ${envPath}`);
