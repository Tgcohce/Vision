'use strict';

const Web3 = require('web3');
const axios = require('axios');
const { logger } = require('../monitoring/logger');
const notificationService = require('./notificationService');

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
  },
  // Event: StakeDeposited(address indexed validator, uint256 amount, uint256 timestamp)
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "validator", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" },
      { "indexed": false, "name": "timestamp", "type": "uint256" }
    ],
    "name": "StakeDeposited",
    "type": "event"
  },
  // Event: StakeWithdrawn(address indexed validator, uint256 amount, uint256 timestamp)
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "validator", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" },
      { "indexed": false, "name": "timestamp", "type": "uint256" }
    ],
    "name": "StakeWithdrawn",
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
    const events = await contract.getPastEvents(eventName, { 
      fromBlock: options.fromBlock || 0, 
      toBlock: options.toBlock || 'latest' 
    });
    logger.info(`Fetched ${events.length} events for ${eventName} from ${contractAddress}`);
    
    // Process events through notification service
    events.forEach(event => {
      notificationService.handleBlockchainEvent(event, eventName);
    });
    
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
 * Get validator performance metrics
 * @returns {Array} - Array of validator performance data
 */
function getValidatorMetrics() {
  return notificationService.getValidatorPerformance();
}

/**
 * Get recent notifications
 * @param {number} limit - Maximum number of notifications to return
 * @returns {Array} - Notification history
 */
function getRecentNotifications(limit = 20) {
  return notificationService.getNotificationHistory(limit);
}

/**
 * Setup event subscription for real-time monitoring
 * @param {string} contractAddress - The contract address to monitor
 * @param {Object} options - Subscription options
 * @returns {Object} - The subscription object
 */
function setupEventSubscription(contractAddress, options = {}) {
  const providerUrl = options.providerUrl || defaultProviderUrl;
  
  // We need a WebSocket provider for subscriptions
  if (!providerUrl.startsWith('ws')) {
    logger.error('WebSocket provider required for event subscriptions');
    return null;
  }
  
  const wsWeb3 = new Web3(providerUrl);
  const contract = new wsWeb3.eth.Contract(options.abi || defaultAvsAbi, contractAddress);
  
  // Subscribe to all events
  const subscription = contract.events.allEvents()
    .on('data', (event) => {
      logger.info(`New event received: ${event.event}`);
      notificationService.handleBlockchainEvent(event, event.event);
      
      // Optionally send a Telegram notification for important events
      if (options.notifyTelegram) {
        const shortAddress = `${event.returnValues.validator.substring(0, 6)}...${event.returnValues.validator.substring(event.returnValues.validator.length - 4)}`;
        notificationService.sendTelegramNotification(
          `New ${event.event} event from validator ${shortAddress}`
        );
      }
    })
    .on('error', (error) => {
      logger.error(`Error in event subscription: ${error.message}`);
    });
  
  logger.info(`Subscribed to events for contract ${contractAddress}`);
  return subscription;
}

/**
 * Aggregate AVS data from an arbitrary deployed AVS.
 * The function takes an AVS identifier (address) and optionally an ABI and provider URL.
 * @param {string} avsAddress - The deployed AVS contract address.
 * @param {Object} [options] - Optional parameters: { abi, providerUrl, offchainEndpoint }
 * @returns {Promise<Object>} - Aggregated data including onchain and offchain info.
 */
async function aggregateAvsData(avsAddress, options = {}) {
  const result = { 
    avsAddress, 
    onchain: {}, 
    offchain: {},
    validatorMetrics: getValidatorMetrics(),
    recentNotifications: getRecentNotifications()
  };

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
  
  try {
    result.onchain.StakeDeposited = await fetchOnchainEvents(avsAddress, 'StakeDeposited', options);
  } catch (error) {
    result.onchain.StakeDeposited = [];
  }
  
  try {
    result.onchain.StakeWithdrawn = await fetchOnchainEvents(avsAddress, 'StakeWithdrawn', options);
  } catch (error) {
    result.onchain.StakeWithdrawn = [];
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
  aggregateAvsData,
  setupEventSubscription,
  getValidatorMetrics,
  getRecentNotifications
};