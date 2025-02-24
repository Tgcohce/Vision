'use strict';

const fs = require('fs');
const path = require('path');
const { logger } = require('../monitoring/logger');

// Utility: Simple topological sort for dependency resolution
function topologicalSort(artifacts) {
  const sorted = [];
  const visited = new Set();
  const temp = new Set();

  // Map artifact IDs to artifacts for quick lookup
  const artifactMap = artifacts.reduce((map, artifact) => {
    map[artifact.id] = artifact;
    return map;
  }, {});

  function visit(artifact) {
    if (temp.has(artifact.id)) {
      throw new Error(`Cyclic dependency detected at artifact ${artifact.id}`);
    }
    if (!visited.has(artifact.id)) {
      temp.add(artifact.id);
      if (artifact.dependencies && artifact.dependencies.length > 0) {
        artifact.dependencies.forEach(depId => {
          const dep = artifactMap[depId];
          if (!dep) {
            throw new Error(`Artifact ${artifact.id} depends on missing artifact ${depId}`);
          }
          visit(dep);
        });
      }
      temp.delete(artifact.id);
      visited.add(artifact.id);
      sorted.push(artifact);
    }
  }

  artifacts.forEach(artifact => {
    if (!visited.has(artifact.id)) {
      visit(artifact);
    }
  });

  return sorted;
}

// Function to check required environment variables for integrations
function checkIntegrations() {
  const missing = [];

  // P2P integration
  if (!process.env.P2P_PROTOCOL) {
    missing.push('P2P_PROTOCOL (e.g., "libp2p")');
  }
  if (!process.env.P2P_MAX_PEERS) {
    missing.push('P2P_MAX_PEERS (e.g., "20")');
  }

  // Othentic integration (using CLI)
  if (!process.env.OTHENTIC_CLI_PATH) {
    missing.push('OTHENTIC_CLI_PATH (path to Othentic CLI executable)');
  }

  // Gaia integration is skipped because Gaianet is currently unreachable

  if (missing.length > 0) {
    logger.warn('Missing environment variables for integrations:', missing.join(', '));
  } else {
    logger.info('All required integration environment variables are set.');
  }
}

// Main simulation function: Reads manifest, resolves dependencies, and outputs a preview report
function simulateDeployment() {
  const manifestPath = path.join(process.cwd(), 'dist', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Deployment manifest not found. Ensure code generation has run.');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const simulationReport = {
    networkId: manifest.networkId,
    environment: manifest.environment,
    resolvedDeploymentOrder: [],
    warnings: []
  };

  try {
    // Perform topological sort based on dependencies
    simulationReport.resolvedDeploymentOrder = topologicalSort(manifest.artifacts).map(a => ({
      id: a.id,
      type: a.type,
      sourcePath: a.sourcePath,
      deployParams: a.deployParams,
      dependencies: a.dependencies
    }));
  } catch (error) {
    simulationReport.warnings.push(error.message);
  }

  // Check for required integration environment variables
  checkIntegrations();

  logger.info('Simulation Report:', simulationReport);

  // Write the resolved manifest to a file for preview
  const outputPath = path.join(process.cwd(), 'dist', 'resolved_manifest.json');
  fs.writeFileSync(outputPath, JSON.stringify(simulationReport, null, 2));
  logger.info(`Resolved deployment manifest written to ${outputPath}`);

  return simulationReport;
}

// Execute simulation if the script is run directly
if (require.main === module) {
  try {
    simulateDeployment();
  } catch (err) {
    logger.error('Simulation failed:', err.message);
    process.exit(1);
  }
}

module.exports = {
  simulateDeployment
};
