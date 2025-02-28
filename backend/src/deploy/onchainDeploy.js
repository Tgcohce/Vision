'use strict';

const fs = require('fs');
const path = require('path');
const { logger } = require('../monitoring/logger');
const { deployArtifacts } = require('./deployOrchestrator');

/**
 * Creates a deployment manifest and deploys contracts using deployOrchestrator
 */
async function deployOnChainArtifacts() {
  try {
    // Generate manifest if needed
    const manifestDir = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(manifestDir)) {
      fs.mkdirSync(manifestDir, { recursive: true });
    }
    
    // Create a basic manifest with the TestGovernance contract
    const manifest = {
      "artifacts": [
        {
          "id": "governance", 
          "type": "onchain",
          "sourcePath": "contracts/TestGovernance.sol",
          "deployParams": {
            "threshold": 70,
            "delay": 1500
          }
        }
      ]
    };
    
    const manifestPath = path.join(manifestDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    logger.info('Created deployment manifest at', manifestPath);
    
    // Deploy using the orchestrator
    await deployArtifacts();
    logger.info('Governance contract deployed successfully');
  } catch (error) {
    logger.error('Error deploying onchain artifacts:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  deployOnChainArtifacts();
}

module.exports = { deployOnChainArtifacts };