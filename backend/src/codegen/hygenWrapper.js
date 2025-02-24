const { runner } = require('hygen');
const { createPrompter } = require('enquirer');

/**
 * Generate code for a single node using Hygen.
 * @param {Object} node - The node from the IR.
 */
async function generateComponent(node) {
  // Map node type to Hygen template directory
  const templateMapping = {
    "governance": "smart-contracts/governance",
    "attestation": "smart-contracts/attestation",
    "p2p": "p2p/messaging",
    "ai": "ai/ai",
    "tangle": "tangle/logger"
  };

  const templateFolder = templateMapping[node.type];
  if (!templateFolder) {
    console.warn(`No template mapping for node type: ${node.type}`);
    return;
  }

  // Build Hygen command arguments
  const args = ['generate', templateFolder, '--name', node.id];

  // Append additional properties as arguments
  for (const [key, value] of Object.entries(node.properties)) {
    args.push(`--${key}`, String(value));
  }

  try {
    await runner(args, {
      cwd: process.cwd(),
      logger: console,
      createPrompter: () => createPrompter()
    });
    console.log(`Generated code for node ${node.id}`);
  } catch (error) {
    console.error(`Error generating code for node ${node.id}:`, error);
  }
}

/**
 * Generate code for all nodes in the IR.
 * @param {Object} ir - The normalized design.
 */
async function generateFromIR(ir) {
  for (const node of ir.nodes) {
    await generateComponent(node);
  }
}

module.exports = {
  generateFromIR
};
