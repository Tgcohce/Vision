const fs = require('fs');
const path = require('path');

/**
 * Generate a deployment manifest from the IR.
 * @param {Object} ir - The normalized design.
 */
function generateManifest(ir) {
  const manifest = {
    networkId: ir.networkId,
    environment: ir.environment,
    artifacts: ir.nodes.map(node => ({
      id: node.id,
      type: node.type,
      targetFile: `dist/${node.id}.js`, // Example path; adjust as needed.
      dependencies: node.dependencies
    }))
  };
  const manifestPath = path.join(process.cwd(), 'dist', 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Deployment manifest generated at', manifestPath);
}

module.exports = {
  generateManifest
};
