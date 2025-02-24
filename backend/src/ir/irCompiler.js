const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const ajv = new Ajv();
const schemaPath = path.join(__dirname, 'irSchema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

/**
 * Parse and validate the design JSON against the schema.
 * @param {Object} designJson
 * @returns {Object} Validated design JSON
 * @throws Error if validation fails.
 */
function parseAndValidateDesign(designJson) {
  const valid = ajv.validate(schema, designJson);
  if (!valid) {
    console.error("Validation errors:", ajv.errors);
    throw new Error("Design validation failed.");
  }
  return designJson;
}

/**
 * Normalize the design by merging global defaults and ensuring required fields.
 * @param {Object} design
 * @returns {Object} Normalized design (IR)
 */
function normalizeDesign(design) {
  design.nodes = design.nodes.map((node) => {
    // Merge global defaults into node properties if not explicitly set
    Object.entries(design.globalDefaults || {}).forEach(([key, value]) => {
      if (node.properties[key] === undefined) {
        node.properties[key] = value;
      }
    });
    // Ensure dependencies is defined
    if (!node.dependencies) node.dependencies = [];
    return node;
  });
  return design;
}

module.exports = {
  parseAndValidateDesign,
  normalizeDesign
};
