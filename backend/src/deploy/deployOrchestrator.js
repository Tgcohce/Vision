"use strict";

const fs = require("fs");
const path = require("path");
const Web3 = require("web3");
const solc = require("solc");
const { exec } = require("child_process");
const { logger } = require("../monitoring/logger");

const providerUrl = process.env.PROVIDER_URL || "https://your-testnet-node-url";
const web3 = new Web3(providerUrl);
const deployerAccount = process.env.DEPLOYER_ACCOUNT || "0xYourAccountAddress";
const privateKey = process.env.DEPLOYER_PRIVATE_KEY || "0xYourPrivateKey";

/**
 * Compiles and deploys a Solidity contract.
 * @param {string} contractPath - Path to the Solidity file.
 * @param {Array} constructorArgs - Array of constructor arguments.
 * @returns {Promise<string>} - The deployed contract address.
 */
async function deployOnchainArtifact(contractPath, constructorArgs = []) {
  logger.info(`Deploying onchain artifact from ${contractPath}`);
  const source = fs.readFileSync(contractPath, "utf8");
  const input = {
    language: "Solidity",
    sources: {
      "Contract.sol": { content: source }
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"]
        }
      }
    }
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    output.errors.forEach(err => logger.error(err.formattedMessage));
    throw new Error(`Compilation errors in ${contractPath}`);
  }
  const contractName = Object.keys(output.contracts["Contract.sol"])[0];
  const abi = output.contracts["Contract.sol"][contractName].abi;
  const bytecode = output.contracts["Contract.sol"][contractName].evm.bytecode.object;
  const contract = new web3.eth.Contract(abi);
  const deployTx = contract.deploy({ data: "0x" + bytecode, arguments: constructorArgs });
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
 * Updates the configuration JSON file with the deployed contract address.
 * @param {string} nodeId - The ID of the node to update (e.g., "node_1").
 * @param {string} deployedAddress - The deployed contract address.
 * @returns {boolean} - Whether the update was successful
 */
function updateConfigWithAddress(nodeId, deployedAddress) {
  // Ensure we have a valid address
  if (!deployedAddress || !deployedAddress.startsWith("0x")) {
    logger.error(`Invalid address provided for node ${nodeId}: ${deployedAddress}`);
    return false;
  }

  // Determine the absolute path to the config file.
  const configPath = path.join(process.cwd(), "src", "config", "config.json");
  logger.info(`Updating config file at: ${configPath}`);

  // Check if the file exists.
  if (!fs.existsSync(configPath)) {
    logger.error(`Config file not found at ${configPath}`);
    return false;
  }

  try {
    // Read the existing configuration.
    const configData = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configData);

    // Update the node with the given nodeId.
    let updated = false;
    config.nodes = config.nodes.map(node => {
      if (node.id === nodeId) {
        if (!node.integration) node.integration = {};
        node.integration.contractAddress = deployedAddress;
        updated = true;
        logger.info(`Updated node ${nodeId} with address: ${deployedAddress}`);
      }
      return node;
    });

    if (!updated) {
      // Check if this is a node type match instead of direct ID match
      // This is useful when artifact ID is different from node ID but matches node type
      const nodeType = nodeId.toLowerCase();
      config.nodes = config.nodes.map(node => {
        if (node.type.toLowerCase() === nodeType) {
          if (!node.integration) node.integration = {};
          node.integration.contractAddress = deployedAddress;
          updated = true;
          logger.info(`Updated node of type ${nodeType} (ID: ${node.id}) with address: ${deployedAddress}`);
        }
        return node;
      });
    }

    if (!updated) {
      logger.warn(`Could not find node with ID ${nodeId} or matching type in config.`);
      return false;
    }

    // Write the updated configuration back to the file.
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info(`Config file updated successfully.`);
    return true;
  } catch (error) {
    logger.error(`Error updating config file: ${error.message}`);
    return false;
  }
}

/**
 * Utility function to populate the config file with test addresses.
 * This is helpful for testing without actually deploying contracts.
 * @param {boolean} overwriteExisting - Whether to overwrite existing addresses
 * @returns {boolean} - Whether the update was successful
 */
function populateTestAddresses(overwriteExisting = false) {
  const configPath = path.join(process.cwd(), "src", "config", "config.json");
  logger.info(`Populating test addresses in config file at: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    logger.error(`Config file not found at ${configPath}`);
    return false;
  }

  try {
    const configData = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configData);

    // Generate valid Ethereum addresses that pass checksum tests
    config.nodes = config.nodes.map((node, index) => {
      if (node.integration && (!node.integration.contractAddress || overwriteExisting)) {
        // Use properly formatted Ethereum addresses (all lowercase or checksummed)
        // For testing we'll use a deterministic pattern with valid checksums
        const testAddress = `0x${(index + 1).toString(16).padStart(40, '0')}`;
        node.integration.contractAddress = testAddress;
        logger.info(`Populated test address for ${node.id}: ${testAddress}`);
      }
      return node;
    });

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    logger.info(`Config file updated with test addresses.`);
    return true;
  } catch (error) {
    logger.error(`Error updating config file with test addresses: ${error.message}`);
    return false;
  }
}

/**
 * Dummy deploy orchestrator that reads a manifest and deploys artifacts.
 * After deploying, it updates the configuration file with the deployed address.
 */
async function deployArtifacts() {
  const manifestPath = path.join(process.cwd(), "dist", "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Deployment manifest not found. Please generate it first.");
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  // Loop over each artifact in the manifest
  for (const artifact of manifest.artifacts) {
    try {
      if (artifact.type === "onchain") {
        // Deploy the onchain contract and capture the deployed address
        const deployedAddress = await deployOnchainArtifact(
          path.join(process.cwd(), artifact.sourcePath),
          Object.values(artifact.deployParams)
        );
        logger.info(`Onchain artifact ${artifact.id} deployed at ${deployedAddress}`);

        // Update the configuration file with the new contract address
        const success = updateConfigWithAddress(artifact.id, deployedAddress);
        if (!success) {
          // Try with a more generic node type match if the direct ID match failed
          const nodeType = artifact.id.replace(/[-_]/g, '').toLowerCase();
          const success = updateConfigWithAddress(nodeType, deployedAddress);
          if (!success) {
            logger.warn(`Could not update config for artifact ${artifact.id} - no matching node found`);
          }
        }
      } else if (artifact.type === "offchain") {
        // Deploy offchain components (e.g., using kubectl)
        exec(`kubectl apply -f ${path.join(process.cwd(), artifact.sourcePath)}`, (error, stdout, stderr) => {
          if (error) {
            logger.error(`Error deploying ${artifact.sourcePath}: ${error.message}`);
            return;
          }
          logger.info(`Offchain manifest applied: ${stdout}`);
        });
      } else {
        logger.warn(`Unknown artifact type for ${artifact.id}`);
      }
    } catch (error) {
      logger.error(`Deployment error for ${artifact.id}: ${error.message}`);
    }
  }
}

module.exports = { 
  deployArtifacts, 
  updateConfigWithAddress,
  populateTestAddresses
};