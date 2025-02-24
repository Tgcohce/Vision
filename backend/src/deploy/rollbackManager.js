const fs = require('fs');
const path = require('path');
const { logger } = require('../monitoring/logger');

/**
 * Saves a snapshot of the current deployment manifest with a version tag.
 * @param {string} version - Version identifier.
 */
function saveDeploymentSnapshot(version) {
  const manifestPath = path.join(process.cwd(), 'dist', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Manifest not found.');
  }
  const snapshotDir = path.join(process.cwd(), 'dist', 'versions');
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir);
  }
  const snapshotPath = path.join(snapshotDir, `manifest_${version}.json`);
  fs.copyFileSync(manifestPath, snapshotPath);
  logger.info(`Saved deployment snapshot as version ${version}`);
}

/**
 * Rollback to a given deployment version.
 * @param {string} version - Version identifier.
 */
function rollbackDeployment(version) {
  const snapshotPath = path.join(process.cwd(), 'dist', 'versions', `manifest_${version}.json`);
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot version ${version} not found.`);
  }
  // Overwrite the current manifest with the snapshot
  const manifestPath = path.join(process.cwd(), 'dist', 'manifest.json');
  fs.copyFileSync(snapshotPath, manifestPath);
  logger.info(`Rolled back deployment manifest to version ${version}`);
}

module.exports = {
  saveDeploymentSnapshot,
  rollbackDeployment
};
