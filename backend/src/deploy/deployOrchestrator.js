'use strict';

const fs = require('fs');
const path = require('path');
const { logger } = require('../monitoring/logger');
const Web3 = require('web3');
const solc = require('solc');
const { exec } = require('child_process');

// Configure Web3 for onchain deployment (update with your provider)
const providerUrl = process.env.PROVIDER_URL || 'https://your-testnet-node-url';
const web3 = new Web3(providerUrl);
const deployerAccount = process.env.DEPLOYER_ACCOUNT || '0xYourAccountAddress';
const privateKey = process.env.DEPLOYER_PRIVATE_KEY || '0xYourPrivateKey';

/**
 * Generic onchain deployment function.
 * It compiles and deploys a Solidity contract from the given file path.
 * @param {string} contractPath - Path to the Solidity file.
 * @param {Array} constructorArgs - Array of constructor arguments.
 * @returns {Promise<string>} - Deployed contract address.
 */
async function deployOnchainArtifact(contractPath, constructorArgs = []) {
  logger.info(`Deploying onchain artifact from ${contractPath}`);

  const source = fs.readFileSync(contractPath, 'utf8');
  const input = {
    language: 'Solidity',
    sources: {
      'Contract.sol': { content: source }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    output.errors.forEach(err => logger.error(err.formattedMessage));
    throw new Error(`Compilation errors in ${contractPath}`);
  }

  const contractName = Object.keys(output.contracts['Contract.sol'])[0];
  const abi = output.contracts['Contract.sol'][contractName].abi;
  const bytecode = output.contracts['Contract.sol'][contractName].evm.bytecode.object;

  const contract = new web3.eth.Contract(abi);
  const deployTx = contract.deploy({ data: '0x' + bytecode, arguments: constructorArgs });
  const gasEstimate = await deployTx.estimateGas({ from: deployerAccount });

  const tx = {
    from: deployerAccount,
    gas: gasEstimate,
    data: deployTx.encodeABI()
  };

  const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

  logger.info(`${contractName} deployed at address: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

/**
 * Generic offchain deployment function.
 * It applies Kubernetes manifests using kubectl.
 * @param {string} manifestPath - Path to the Kubernetes manifest file.
 */
function deployOffchainArtifact(manifestPath) {
  logger.info(`Deploying offchain artifact from ${manifestPath}`);
  exec(`kubectl apply -f ${manifestPath}`, (error, stdout, stderr) => {
    if (error) {
      logger.error(`Error applying manifest ${manifestPath}: ${error.message}`);
      return;
    }
    logger.info(`Manifest applied successfully:\n${stdout}`);
  });
}

/**
 * Main deployment orchestrator function.
 * Reads the deployment manifest and deploys each artifact based on its type.
 */
async function deployArtifacts() {
  const manifestPath = path.join(process.cwd(), 'dist', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Deployment manifest not found. Please generate it first.');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Loop over each artifact
  for (const artifact of manifest.artifacts) {
    try {
      if (artifact.type === 'onchain') {
        // Deploy onchain smart contract
        // Use deployParams for constructor arguments
        const deployedAddress = await deployOnchainArtifact(
          path.join(process.cwd(), artifact.sourcePath),
          Object.values(artifact.deployParams)
        );
        // Here you might update the manifest or configuration with the deployed address
        logger.info(`Onchain artifact ${artifact.id} deployed at ${deployedAddress}`);
      } else if (artifact.type === 'offchain') {
        // Deploy offchain component via Kubernetes manifest
        deployOffchainArtifact(path.join(process.cwd(), artifact.sourcePath));
      } else {
        logger.warn(`Unknown artifact type for ${artifact.id}`);
      }
    } catch (error) {
      logger.error(`Deployment error for ${artifact.id}: ${error.message}`);
      // Optionally trigger rollback or exit process
    }
  }
}

module.exports = {
  deployArtifacts
};
