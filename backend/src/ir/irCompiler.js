const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const { logger } = require('../monitoring/logger');
const ajv = new Ajv();
const schemaPath = path.join(__dirname, 'irSchema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const configPath = path.join(process.cwd(), 'src', 'config', 'config.json');

/**
 * Parse and validate the design JSON against the schema.
 * @param {Object} designJson
 * @returns {Object} Validated design JSON
 * @throws Error if validation fails.
 */
function parseAndValidateDesign(designJson) {
  const valid = ajv.validate(schema, designJson);
  if (!valid) {
    logger.error("Validation errors:", ajv.errors);
    throw new Error("Design validation failed: " + ajv.errorsText());
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
  
  // Derive dependencies from connections
  design.connections.forEach(connection => {
    const sourceNode = design.nodes.find(node => node.id === connection.source);
    const targetNode = design.nodes.find(node => node.id === connection.target);
    
    if (sourceNode && targetNode) {
      // Add target as dependency of source if not already there
      if (!sourceNode.dependencies.includes(targetNode.id)) {
        sourceNode.dependencies.push(targetNode.id);
      }
    }
  });
  
  return design;
}

/**
 * Transform frontend drag-and-drop design into backend IR format
 * @param {Object} frontendDesign - The frontend design with blocks and connections
 * @returns {Object} Backend IR compliant design
 */
function transformFrontendDesign(frontendDesign) {
  // Create base structure for backend design
  const backendDesign = {
    networkId: frontendDesign.networkId || "avs-network-" + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
    environment: frontendDesign.environment || "testnet",
    globalDefaults: frontendDesign.globalDefaults || {
      timeout: 3000,
      retryAttempts: 3
    },
    nodes: [],
    connections: []
  };
  
  // Map frontend blocks to backend nodes
  const nodeTypeMap = {
    'validator': 'governance',
    'storage': 'attestation',
    'compute': 'ai',
    'message': 'p2p',
    'contract': 'tangle'
  };
  
  // Map frontend blocks to backend nodes
  frontendDesign.blocks.forEach((block, index) => {
    // Map frontend block type to backend node type
    const nodeType = nodeTypeMap[block.type.toLowerCase()] || block.type;
    
    // Generate properties based on block type
    let properties = {};
    let integration = { provider: "Default" };
    
    switch (nodeType) {
      case 'governance':
        properties = { votingThreshold: 0.67, stakingRequirement: 1000 };
        integration = { provider: "Othentic", contractAddress: "" };
        break;
      case 'attestation':
        properties = { minValidators: 5 };
        integration = { provider: "Othentic", contractAddress: "" };
        break;
      case 'p2p':
        properties = { protocol: "libp2p", maxPeers: 20 };
        integration = { provider: "P2P" };
        break;
      case 'ai':
        properties = { model: "anomalyDetector", threshold: 0.05 };
        integration = { provider: "Gaia", contractAddress: "" };
        break;
      case 'tangle':
        properties = { ledgerId: "tangle_01" };
        integration = { provider: "Tangle", contractAddress: "" };
        break;
    }
    
    // Override with any properties from the frontend
    if (block.properties) {
      properties = { ...properties, ...block.properties };
    }
    
    // Preserve existing integration if available
    if (block.integration) {
      integration = { ...integration, ...block.integration };
    }
    
    backendDesign.nodes.push({
      id: block.id,
      type: nodeType,
      properties,
      integration,
      dependencies: []
    });
  });
  
  // Map frontend connections to backend connections
  frontendDesign.connections.forEach(conn => {
    // Determine channel type based on connection type or defaults
    let channel = conn.type || "data";
    
    backendDesign.connections.push({
      source: conn.sourceId,
      target: conn.targetId,
      channel,
      parameters: conn.parameters || { format: "JSON" }
    });
  });
  
  return backendDesign;
}

/**
 * Save design to config.json
 * @param {Object} design - The validated and normalized design
 * @returns {boolean} - Success status
 */
function saveDesignToConfig(design) {
  try {
    // Preserve contract addresses from existing config if they exist
    try {
      const existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Map existing addresses to new design
      design.nodes.forEach(node => {
        const existingNode = existingConfig.nodes.find(n => n.id === node.id || n.type === node.type);
        if (existingNode && existingNode.integration && existingNode.integration.contractAddress) {
          node.integration.contractAddress = existingNode.integration.contractAddress;
        }
      });
    } catch (error) {
      logger.warn(`Could not read existing config: ${error.message}`);
    }
    
    fs.writeFileSync(configPath, JSON.stringify(design, null, 2));
    logger.info('Design successfully saved to config.json');
    return true;
  } catch (error) {
    logger.error(`Failed to save design to config: ${error.message}`);
    return false;
  }
}

module.exports = {
  parseAndValidateDesign,
  normalizeDesign,
  transformFrontendDesign,
  saveDesignToConfig
};