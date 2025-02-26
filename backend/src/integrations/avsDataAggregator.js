'use strict';

const Web3 = require('web3');
const axios = require('axios');
const { logger } = require('../monitoring/logger');

// Use environment variable for default provider URL; can be overridden by user input if needed.
const defaultProviderUrl = process.env.PROVIDER_URL || 'https://your-default-node-url';
const web3 = new Web3(defaultProviderUrl);

/**
 * Default ABI for a typical AVS contract.
 * In production, you might have a library of known ABIs or a registry.
 * For demonstration, we use a simplified ABI containing common events.
 */
const defaultAvsAbi = [
  // Event: TaskValidated(address indexed validator, bool result, uint256 timestamp)
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "validator", "type": "address" },
      { "indexed": false, "name": "result", "type": "bool" },
      { "indexed": false, "name": "timestamp", "type": "uint256" }
    ],
    "name": "TaskValidated",
    "type": "event"
  },
  // Event: TaskAttested(address indexed validator, bool success, uint256 timestamp)
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "validator", "type": "address" },
      { "indexed": false, "name": "success", "type": "bool" },
      { "indexed": false, "name": "timestamp", "type": "uint256" }
    ],
    "name": "TaskAttested",
    "type": "event"
  }
];

/**
 * Fetch onchain events from an AVS contract.
 * @param {string} contractAddress - The AVS contract address provided by the user.
 * @param {string} eventName - The name of the event to fetch (e.g., 'TaskValidated').
 * @param {Object} [options] - Optional parameters, including ABI and provider URL.
 * @returns {Promise<Array>} - Array of event objects.
 */
async function fetchOnchainEvents(contractAddress, eventName, options = {}) {
  const providerUrl = options.providerUrl || defaultProviderUrl;
  const localWeb3 = new Web3(providerUrl);
  const abi = options.abi || defaultAvsAbi;

  const contract = new localWeb3.eth.Contract(abi, contractAddress);
  try {
    const events = await contract.getPastEvents(eventName, { fromBlock: 0, toBlock: 'latest' });
    logger.info(`Fetched ${events.length} events for ${eventName} from ${contractAddress}`);
    return events;
  } catch (error) {
    logger.error(`Error fetching events from ${contractAddress} for ${eventName}: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch offchain service data (if applicable) from a provided API endpoint.
 * @param {string} apiUrl - The API endpoint to query.
 * @returns {Promise<Object>} - Offchain data.
 */
async function fetchOffchainData(apiUrl) {
  try {
    const response = await axios.get(apiUrl);
    return response.data;
  } catch (error) {
    logger.error('Error fetching offchain data:', error.message);
    throw error;
  }
}

/**
 * Aggregate AVS data from an arbitrary deployed AVS.
 * The function takes an AVS identifier (address) and optionally an ABI and provider URL.
 * @param {string} avsAddress - The deployed AVS contract address.
 * @param {Object} [options] - Optional parameters: { abi, providerUrl, offchainEndpoint }
 * @returns {Promise<Object>} - Aggregated data including onchain and offchain info.
 */
async function aggregateAvsData(avsAddress, options = {}) {
  const result = { avsAddress, onchain: {}, offchain: {} };

  // Fetch onchain events for common events
  try {
    result.onchain.TaskValidated = await fetchOnchainEvents(avsAddress, 'TaskValidated', options);
  } catch (error) {
    result.onchain.TaskValidated = [];
  }
  try {
    result.onchain.TaskAttested = await fetchOnchainEvents(avsAddress, 'TaskAttested', options);
  } catch (error) {
    result.onchain.TaskAttested = [];
  }

  // Optionally, fetch offchain data if an endpoint is provided
  if (options.offchainEndpoint) {
    try {
      result.offchain.serviceStatus = await fetchOffchainData(options.offchainEndpoint);
    } catch (error) {
      result.offchain.serviceStatus = {};
    }
  }

  logger.info('Aggregated AVS data:', result);
  return result;
}

module.exports = {
  aggregateAvsData
};
