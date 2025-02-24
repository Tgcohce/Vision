'use strict';

const fs = require('fs');
const path = require('path');
const solc = require('solc');
const Web3 = require('web3');
const { logger } = require('../monitoring/logger');

// Use environment variables for configuration
const providerUrl = process.env.PROVIDER_URL || 'https://default-node-url';
const web3 = new Web3(providerUrl);
const deployerAccount = process.env.DEPLOYER_ACCOUNT || '0xDefaultAccount';
const privateKey = process.env.DEPLOYER_PRIVATE_KEY || '0xDefaultPrivateKey';

/**
 * Compiles and deploys a smart contract.
 * @param {string} contractPath - Path to the Solidity file.
 * @param {Array} constructorArgs - Array of constructor arguments.
 * @returns {Promise<string>} - The deployed contract address.
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

async function deployOnChainArtifacts() {
  try {
    const governanceContractPath = path.join(process.cwd(), 'contracts', 'TestGovernance.sol');
    // Example constructor args pulled from your manifest or config
    const governanceAddress = await deployOnchainArtifact(governanceContractPath, [70, 1500]);
    logger.info('Governance contract deployed at:', governanceAddress);
    // Additional deployments...
  } catch (error) {
    logger.error('Error deploying onchain artifacts:', error);
  }
}

deployOnChainArtifacts();
