const express = require('express');
const { logger } = require('./logger');
const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Setup a simple Express server to expose metrics
const app = express();
const PORT = process.env.MONITORING_PORT || 3001;

// Read configuration file to get contract addresses
const configPath = path.join(process.cwd(), 'src', 'config', 'config.json');
let config;
try {
  const configData = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configData);
  logger.info('Successfully loaded configuration');
} catch (error) {
  logger.error(`Failed to load configuration: ${error.message}`);
  config = { nodes: [] };
}

// Find governance node in the config
const governanceNode = config.nodes.find(node => node.type === 'governance');
const governanceAddress = governanceNode && 
                         governanceNode.integration && 
                         governanceNode.integration.contractAddress 
                         ? governanceNode.integration.contractAddress 
                         : null;

// Connect to blockchain and set up contracts only if we have valid addresses
const providerUrl = process.env.PROVIDER_URL || 'https://your-testnet-node-url';
const web3 = new Web3(providerUrl);

// Example governance ABI (should be loaded from actual ABI file in production)
const governanceAbi = [
  // Basic ABI with just the events we need
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "validator", "type": "address" },
      { "indexed": true, "name": "taskId", "type": "uint256" },
      { "indexed": false, "name": "result", "type": "bool" }
    ],
    "name": "TaskValidated",
    "type": "event"
  }
];

// Log the current environment
logger.info(`Running in ${process.env.NODE_ENV || 'default'} environment`);

// Only initialize contract if we have a valid address
let governanceContract = null;
if (governanceAddress && governanceAddress.startsWith('0x')) {
  try {
    logger.info(`Initializing governance contract at ${governanceAddress}`);
    
    // For development/testing, use a mock contract for safety
    if (process.env.NODE_ENV !== 'production') {
      // Create a mockup contract instance
      logger.info(`Development mode: Using mock contract for ${governanceAddress}`);
      governanceContract = {
        events: {
          TaskValidated: () => ({
            on: (event, callback) => {
              logger.info(`Mock event handler registered for ${event}`);
              return { on: () => {} };
            }
          })
        }
      };
    } else {
      // Only in production, create a real contract instance
      governanceContract = new web3.eth.Contract(governanceAbi, governanceAddress);
    }
  } catch (error) {
    logger.error(`Error initializing governance contract: ${error.message}`);
    // Create a dummy contract so the rest of the code doesn't break
    governanceContract = {
      events: {
        TaskValidated: () => ({
          on: (event, callback) => {
            logger.warn(`Event monitoring disabled due to contract initialization error`);
            return { on: () => {} };
          }
        })
      }
    };
  }
} else {
  logger.warn('Valid governance contract address not found in config. Event monitoring will be disabled.');
  // Create a dummy contract so the rest of the code doesn't break
  governanceContract = {
    events: {
      TaskValidated: () => ({
        on: (event, callback) => {
          logger.warn(`Event monitoring disabled due to missing contract address`);
          return { on: () => {} };
        }
      })
    }
  };
}

// In-memory metrics (in a real setup, use Prometheus client library)
let deploymentSuccessCount = 0;
let deploymentFailureCount = 0;
let validatorConsensusDrops = 0;

// Function to listen for smart contract events
function startOnChainEventListeners() {
  try {
    governanceContract.events
      .TaskValidated({ fromBlock: 'latest' })
      .on('data', event => {
        logger.info('TaskValidated event:', event.returnValues);
        // Update metrics, e.g., increment successful validations, etc.
      })
      .on('error', error => {
        logger.error('Error in TaskValidated event listener:', error);
      });
  } catch (error) {
    logger.error(`Failed to set up event listeners: ${error.message}`);
  }
}

// Expose metrics via an HTTP endpoint
app.get('/metrics', (req, res) => {
  const metrics = `
# HELP deployment_success_total Total successful deployments.
# TYPE deployment_success_total counter
deployment_success_total ${deploymentSuccessCount}

# HELP deployment_failure_total Total deployment failures.
# TYPE deployment_failure_total counter
deployment_failure_total ${deploymentFailureCount}

# HELP validator_consensus_drops Total instances of validator consensus issues.
# TYPE validator_consensus_drops counter
validator_consensus_drops ${validatorConsensusDrops}
  `;
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Start monitoring service and express server
function startMonitoringService() {
  startOnChainEventListeners();
  app.listen(PORT, () => {
    logger.info(`Monitoring service running on port ${PORT}`);
  });

  // Simulated periodic logging to represent a heartbeat check
  setInterval(() => {
    logger.info("Monitoring heartbeat: system is healthy.");
  }, 60000);
}

module.exports = {
  startMonitoringService,
  // Functions to update metrics based on events can be exported here
};