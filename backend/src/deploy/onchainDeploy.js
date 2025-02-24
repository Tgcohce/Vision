'use strict';

const fs = require('fs');
const path = require('path');
const solc = require('solc');
const Web3 = require('web3');
const { logger } = require('../monitoring/logger');

// Configure your Web3 provider (update the URL for your testnet/mainnet)
const providerUrl = 'https://your-testnet-node-url';
const web3 = new Web3(providerUrl);

// Set your deployment account and private key (ensure these are securely managed)
const deployerAccount = '0xYourAccountAddress';
const privateKey = '0xYourPrivateKey';

/**
 * Compiles and deploys a smart contract.
 * @param {string} contractPath - Path to the Solidity file.
 * @param {Array} constructorArgs - Array of constructor arguments.
 * @returns {Promise<string>} - The deployed contract address.
 */
async function deployContract(contractPath, constructorArgs = []) {
  // Read the contract source code
  const source = fs.readFileSync(contractPath, 'utf8');

  // Prepare input for solc compiler
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

  // Compile the contract
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    output.errors.forEach(err => logger.error(err.formattedMessage));
    throw new Error('Compilation errors encountered');
  }

  // Assuming one contract per file for simplicity
  const contractName = Object.keys(output.contracts['Contract.sol'])[0];
  const abi = output.contracts['Contract.sol'][contractName].abi;
  const bytecode = output.contracts['Contract.sol'][contractName].evm.bytecode.object;

  // Create contract instance
  const contract = new web3.eth.Contract(abi);

  // Prepare deployment transaction
  const deployTx = contract.deploy({
    data: '0x' + bytecode,
    arguments: constructorArgs
  });

  // Estimate gas
  const gasEstimate = await deployTx.estimateGas({ from: deployerAccount });
  const txData = deployTx.encodeABI();

  // Create transaction object
  const tx = {
    from: deployerAccount,
    gas: gasEstimate,
    data: txData
  };

  // Sign and send transaction
  const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

  logger.info(`${contractName} deployed at address: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

/**
 * Deploy onchain artifacts.
 */
async function deployOnChainArtifacts() {
  try {
    // Example: Deploy the TestGovernance contract
    const governanceContractPath = path.join(process.cwd(), 'contracts', 'TestGovernance.sol');
    // Use constructor arguments: votingThreshold and stakingRequirement from IR/config
    const governanceAddress = await deployContract(governanceContractPath, [70, 1500]);
    logger.info('Governance contract deployed at:', governanceAddress);

    // Additional deployments for other onchain artifacts can be added here.
    // For example, deploy the Attestation contract:
    // const attestationContractPath = path.join(process.cwd(), 'contracts', 'TestAttestation.sol');
    // const attestationAddress = await deployContract(attestationContractPath, [5]);
    // logger.info('Attestation contract deployed at:', attestationAddress);

  } catch (error) {
    logger.error('Error deploying onchain artifacts:', error);
  }
}

deployOnChainArtifacts();
