#!/usr/bin/env node
"use strict";

const { populateTestAddresses } = require('./deployOrchestrator');
const { logger } = require('../monitoring/logger');

/**
 * Simple CLI tool to populate the config file with test addresses
 * Usage: node src/deploy/populateConfig.js [--overwrite]
 */
function main() {
  const args = process.argv.slice(2);
  const overwriteExisting = args.includes('--overwrite');
  
  logger.info(`Starting config population${overwriteExisting ? ' with overwrite' : ''}`);
  
  const success = populateTestAddresses(overwriteExisting);
  
  if (success) {
    logger.info('Config file successfully populated with test addresses');
    process.exit(0);
  } else {
    logger.error('Failed to populate config file with test addresses');
    process.exit(1);
  }
}

// Run if directly executed
if (require.main === module) {
  main();
}