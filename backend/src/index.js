const fs = require('fs');
const path = require('path');
const { parseAndValidateDesign, normalizeDesign } = require('./ir/irCompiler');
const { generateFromIR } = require('./codegen/hygenWrapper');
const { deployArtifacts } = require('./deploy/deployOrchestrator');
const { logger } = require('./monitoring/logger');

// Load a high-level design JSON (could be provided by a user upload)
const designPath = path.join(__dirname, 'config', 'config.json');
const designData = JSON.parse(fs.readFileSync(designPath, 'utf8'));

async function main() {
  try {
    // Parse and validate design using IR compiler
    const validatedDesign = parseAndValidateDesign(designData);
    const ir = normalizeDesign(validatedDesign);
    logger.info('IR compilation successful:', ir);

    // Generate code artifacts using Hygen integration
    await generateFromIR(ir);
    logger.info('Code generation completed successfully.');

    // Deploy the generated artifacts
    await deployArtifacts();
    logger.info('Deployment orchestration completed successfully.');
  } catch (error) {
    logger.error('Error in AVS backend process:', error);
  }
}

main();
