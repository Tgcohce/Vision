const { runner } = require('hygen');
const { createPrompter } = require('enquirer');

async function generateComponent(node) {
  // Map node type to Hygen template directory
  const templateMapping = {
    "governance": "smart-contracts/governance",
    "attestation": "smart-contracts/attestation",
    "p2p": "p2p",
    "ai": "ai"
  };

  const templateFolder = templateMapping[node.type];
  if (!templateFolder) {
    console.warn(`No template mapping for node type: ${node.type}`);
    return;
  }

  // Build arguments dynamically; environment variables can override IR values
  const args = [
    'generate',
    templateFolder + '/new',
    '--name', node.id,
    '--votingThreshold', node.properties.votingThreshold || process.env.DEFAULT_VOTING_THRESHOLD || '70',
    '--stakingRequirement', node.properties.stakingRequirement || process.env.DEFAULT_STAKING_REQUIREMENT || '1500'
  ];

  // Add additional properties if available
  for (const [key, value] of Object.entries(node.properties)) {
    if (!['votingThreshold', 'stakingRequirement'].includes(key)) {
      args.push(`--${key}`, String(value));
    }
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

async function generateFromIR(ir) {
  for (const node of ir.nodes) {
    await generateComponent(node);
  }
}

module.exports = {
  generateFromIR
};
