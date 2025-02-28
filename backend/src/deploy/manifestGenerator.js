const fs = require('fs');
const path = require('path');
const { logger } = require('../monitoring/logger');

/**
 * Generate a deployment manifest from the IR.
 * @param {Object} ir - The normalized design.
 * @param {boolean} deploy - Whether to deploy the artifacts after generating the manifest
 * @returns {Promise<void>}
 */
async function generateManifest(ir, deploy = false) {
  // Create dist directory if it doesn't exist
  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Generate the manifest
  const manifest = {
    networkId: ir.networkId,
    environment: ir.environment,
    artifacts: ir.nodes.map(node => {
      let sourcePath = '';
      let deployParams = {};
      
      // Set correct sourcePath based on node type
      if (node.type === 'governance') {
        sourcePath = 'contracts/TestGovernance.sol';
        deployParams = { threshold: 70, delay: 1500 };
      } else if (node.type === 'registry') {
        sourcePath = 'contracts/Registry.sol';
      } else {
        // Default for other node types
        sourcePath = `dist/${node.id}.js`;
      }
      
      return {
        id: node.id,
        type: node.type === 'governance' || node.type === 'registry' ? 'onchain' : 'offchain',
        sourcePath: sourcePath,
        deployParams: deployParams,
        dependencies: node.dependencies
      };
    })
  };
  
  const manifestPath = path.join(distDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  logger.info('Deployment manifest generated at', manifestPath);
  
  // If deploy flag is true, deploy the artifacts
  if (deploy) {
    try {
      const { deployArtifacts } = require('./deployOrchestrator');
      logger.info('Deploying artifacts using deployOrchestrator...');
      await deployArtifacts();
      logger.info('Deployment completed successfully.');
    } catch (error) {
      logger.error(`Deployment failed: ${error.message}`);
      throw error;
    }
  }
}

// If called directly with --deploy flag, generate manifest and deploy
if (require.main === module) {
  const args = process.argv.slice(2);
  const shouldDeploy = args.includes('--deploy');
  
  try {
    // Load the IR
    const ir = require('../config/config.json');
    // Generate manifest and optionally deploy
    generateManifest(ir, shouldDeploy)
      .then(() => {
        if (shouldDeploy) {
          logger.info('Manifest generated and artifacts deployed successfully.');
        } else {
          logger.info('Manifest generated successfully.');
        }
      })
      .catch(error => {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
      });
  } catch (error) {
    logger.error(`Failed to load IR: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  generateManifest
};