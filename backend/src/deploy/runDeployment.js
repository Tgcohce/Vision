#!/usr/bin/env node
'use strict';

const { deployArtifacts } = require('./deployOrchestrator');
const { logger } = require('../monitoring/logger');

/**
 * Script to run deployArtifacts when called directly
 * This is used by the npm run deploy command
 */
async function main() {
  logger.info('Starting deployment of artifacts...');
  try {
    await deployArtifacts();
    logger.info('Deployment completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Run when executed directly
main();