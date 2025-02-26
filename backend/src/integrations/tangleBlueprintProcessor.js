'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { logger } = require('../monitoring/logger');

/**
 * Process a Tangle blueprint by calling the Rust CLI tool.
 * @param {Object} blueprintData - Blueprint JSON from the drag-and-drop UI.
 * @returns {Promise<Object>} - Processed blueprint result.
 */
function processTangleBlueprint(blueprintData) {
  return new Promise((resolve, reject) => {
    // Adjust the path based on your project structure
    const binaryPath = path.join(process.cwd(), 'rust', 'eigenlayer_ecdsa_blueprint', 'target', 'release', 'eigenlayer_ecdsa_blueprint');

    const rustProcess = spawn(binaryPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    rustProcess.stdout.on('data', (data) => { stdout += data.toString(); });
    rustProcess.stderr.on('data', (data) => { stderr += data.toString(); });

    rustProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          logger.info('Tangle blueprint processed successfully:', result);
          resolve(result);
        } catch (parseError) {
          reject(new Error('Failed to parse output: ' + parseError.message));
        }
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });

    rustProcess.stdin.write(JSON.stringify(blueprintData));
    rustProcess.stdin.end();
  });
}

module.exports = { processTangleBlueprint };
