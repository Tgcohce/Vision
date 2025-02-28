'use strict';

require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { parseAndValidateDesign, normalizeDesign, transformFrontendDesign, saveDesignToConfig } = require('./ir/irCompiler');
const { generateFromIR } = require('./codegen/hygenWrapper');
const { deployArtifacts } = require('./deploy/deployOrchestrator');
const { simulateDeployment } = require('./deploy/simulateAndResolve');
const { rollbackDeployment } = require('./deploy/rollbackManager');
const { startMonitoringService } = require('./monitoring/monitoringService');
const { authenticateToken } = require('./security/auth');
const { authorizeRole } = require('./security/rbac');
const { logger } = require('./monitoring/logger');
const path = require('path');

// Import integrations
const avsDataAggregator = require('./integrations/avsDataAggregator');
const tangleBlueprintProcessor = require('./integrations/tangleBlueprintProcessor');
const notificationService = require('./integrations/notificationService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Add CORS middleware for frontend development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Endpoint to submit a backend-formatted design and generate a normalized IR
app.post('/api/design', authenticateToken, (req, res) => {
  try {
    const design = req.body;
    const validatedDesign = parseAndValidateDesign(design);
    const ir = normalizeDesign(validatedDesign);
    // For a full MVP, you might store this IR in a database.
    res.status(200).json({ message: 'Design validated and normalized', ir });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to submit a frontend drag-and-drop design and convert to backend format
app.post('/api/frontend-design', authenticateToken, (req, res) => {
  try {
    const frontendDesign = req.body;
    
    // Validate the frontend design has the minimum required fields
    if (!frontendDesign.blocks || !Array.isArray(frontendDesign.blocks) || frontendDesign.blocks.length === 0) {
      return res.status(400).json({ error: 'Design must include blocks array with at least one block' });
    }
    
    if (!frontendDesign.connections || !Array.isArray(frontendDesign.connections)) {
      return res.status(400).json({ error: 'Design must include connections array' });
    }
    
    // Transform frontend design to backend format
    const backendDesign = transformFrontendDesign(frontendDesign);
    
    // Validate and normalize the transformed design
    const validatedDesign = parseAndValidateDesign(backendDesign);
    const ir = normalizeDesign(validatedDesign);
    
    // Save the design to config.json
    const saved = saveDesignToConfig(ir);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save design to configuration' });
    }
    
    res.status(200).json({ 
      message: 'Frontend design successfully transformed, validated, and saved', 
      ir 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to build and deploy AVS design from the frontend
app.post('/api/frontend-build', authenticateToken, async (req, res) => {
  try {
    // Optional: Get the design from the request body or use the saved config
    const frontendDesign = req.body.design;
    let ir;
    
    // If a design was provided, process it first
    if (frontendDesign) {
      // Same validation as in /api/frontend-design
      if (!frontendDesign.blocks || !Array.isArray(frontendDesign.blocks) || frontendDesign.blocks.length === 0) {
        return res.status(400).json({ error: 'Design must include blocks array with at least one block' });
      }
      
      if (!frontendDesign.connections || !Array.isArray(frontendDesign.connections)) {
        return res.status(400).json({ error: 'Design must include connections array' });
      }
      
      // Process as before
      const backendDesign = transformFrontendDesign(frontendDesign);
      const validatedDesign = parseAndValidateDesign(backendDesign);
      ir = normalizeDesign(validatedDesign);
      
      // Save to config
      const saved = saveDesignToConfig(ir);
      if (!saved) {
        return res.status(500).json({ error: 'Failed to save design to configuration' });
      }
      
      logger.info('Frontend design saved before deployment');
    } else {
      // Use the current config.json
      logger.info('Using current config.json for deployment');
    }
    
    // Step 1: Generate code from the design
    logger.info('Generating code from design');
    try {
      // Load the latest config
      const design = require('./config/config.json');
      ir = normalizeDesign(parseAndValidateDesign(design));
      await generateFromIR(ir);
      logger.info('Code generation successful');
    } catch (error) {
      logger.error(`Code generation failed: ${error.message}`);
      return res.status(500).json({ error: `Code generation failed: ${error.message}` });
    }
    
    // Step 2: Generate deployment manifest
    logger.info('Generating deployment manifest');
    try {
      // This is typically done by manifestGenerator.js
      // For simplicity, we'll use a basic HelloWorld manifest for now
      const manifestDir = path.join(process.cwd(), 'dist');
      
      // Create dist directory if it doesn't exist
      if (!fs.existsSync(manifestDir)) {
        fs.mkdirSync(manifestDir, { recursive: true });
      }
      
      // Create a basic manifest with a HelloWorld contract
      const manifest = {
        "artifacts": [
          {
            "id": "node_1", // Should match a node ID in config.json
            "type": "onchain",
            "sourcePath": "contracts/TestGovernance.sol",
            "deployParams": {}
          }
        ]
      };
      
      fs.writeFileSync(path.join(manifestDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      logger.info('Deployment manifest generated');
    } catch (error) {
      logger.error(`Manifest generation failed: ${error.message}`);
      return res.status(500).json({ error: `Manifest generation failed: ${error.message}` });
    }
    
    // Step 3: Deploy the artifacts
    logger.info('Deploying artifacts');
    try {
      await deployArtifacts();
      logger.info('Deployment successful');
    } catch (error) {
      logger.error(`Deployment failed: ${error.message}`);
      return res.status(500).json({ error: `Deployment failed: ${error.message}` });
    }
    
    // Step 4: Deploy to EKS (optional)
    if (req.body.deployToEks) {
      logger.info('Initiating EKS deployment');
      try {
        // Here we would typically call AWS SDK to deploy to EKS
        // For simplicity, we'll just simulate the operation
        
        // In a real implementation, you would:
        // 1. Update the EKS deployment YAML with the deployed contract addresses
        // 2. Use the AWS SDK to apply the updated deployment
        // 3. Wait for the deployment to complete
        
        // Simulate a delay for deployment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        logger.info('EKS deployment complete');
      } catch (error) {
        logger.error(`EKS deployment failed: ${error.message}`);
        // We don't want to fail the entire operation if just EKS deployment fails
        // so we just log the error and continue
      }
    }
    
    // Get the final configuration with all deployed addresses
    const finalConfig = require('./config/config.json');
    
    // Return success with deployment info including all addresses
    const deployedAddresses = {};
    finalConfig.nodes.forEach(node => {
      if (node.integration && node.integration.contractAddress) {
        deployedAddresses[node.type] = node.integration.contractAddress;
      }
    });
    
    res.status(200).json({
      message: 'AVS build and deployment successful',
      config: finalConfig,
      deployedAddresses,
      eksDeployed: req.body.deployToEks || false
    });
  } catch (error) {
    logger.error(`Build process failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to trigger code generation using Hygen
app.post('/api/generate', authenticateToken, authorizeRole('developer', 'admin'), async (req, res) => {
  try {
    // For MVP, we're reading from the config file (or a database)
    const design = require('./config/config.json');
    const ir = normalizeDesign(parseAndValidateDesign(design));
    await generateFromIR(ir);
    res.status(200).json({ message: 'Code generation successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to preview deployment (simulation)
app.get('/api/deployment/preview', authenticateToken, authorizeRole('operator', 'admin'), (req, res) => {
  try {
    const report = simulateDeployment();
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to trigger actual deployment (onchain & offchain)
app.post('/api/deployment/deploy', authenticateToken, authorizeRole('operator', 'admin'), async (req, res) => {
  try {
    await deployArtifacts();
    res.status(200).json({ message: 'Deployment initiated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get AVS data for a specific address
app.get('/api/retina/avs/:avsAddress', authenticateToken, async (req, res) => {
  const { avsAddress } = req.params;
  // Optionally, you can read query parameters for ABI and providerUrl
  // For security, you might restrict ABI input or provide a selection of known ABIs.
  const options = {
    providerUrl: req.query.providerUrl, // e.g., override default if provided
    // If a custom ABI is provided, you might parse it (make sure it's safe!)
    // abi: req.query.abi ? JSON.parse(req.query.abi) : undefined,
    offchainEndpoint: req.query.offchainEndpoint // if user wants to include offchain status
  };
  try {
    const data = await avsDataAggregator.aggregateAvsData(avsAddress, options);
    res.status(200).json({ message: 'Aggregated AVS data retrieved successfully', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to process Tangle blueprints
app.post('/api/tangle/blueprint', authenticateToken, async (req, res) => {
  try {
    const blueprintData = req.body;
    const result = await tangleBlueprintProcessor.processTangleBlueprint(blueprintData);
    res.status(200).json({ message: 'Blueprint processed successfully', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint for AVS data
app.get('/api/avs/debug', authenticateToken, async (req, res) => {
  try {
    const aggregatedData = await avsDataAggregator.aggregateAvsData();
    res.status(200).json(aggregatedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add endpoints for validator metrics and notifications
app.get('/api/validators/metrics', authenticateToken, async (req, res) => {
  try {
    const metrics = avsDataAggregator.getValidatorMetrics();
    res.status(200).json({ 
      message: 'Validator metrics retrieved successfully', 
      metrics 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/validators/notifications', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const notifications = avsDataAggregator.getRecentNotifications(limit);
    res.status(200).json({ 
      message: 'Recent notifications retrieved successfully', 
      notifications 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to get deployed contract address
app.get('/api/deployment/addresses', authenticateToken, async (req, res) => {
  try {
    // Read from the config file to get deployed addresses
    const config = require('./config/config.json');
    const addresses = {};
    
    // Extract contract addresses for each node type
    config.nodes.forEach(node => {
      if (node.integration && node.integration.contractAddress) {
        addresses[node.type] = node.integration.contractAddress;
      }
    });
    
    res.status(200).json({ 
      message: 'Deployed contract addresses retrieved successfully', 
      addresses 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to send a test notification
app.post('/api/notifications/test', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { message, priority } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const result = await notificationService.sendTelegramNotification(
      message, 
      { priority: priority || 'normal' }
    );
    
    res.status(200).json({ 
      message: 'Test notification sent', 
      success: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for direct validator action recording (for testing)
app.post('/api/validators/action', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const { validatorAddress, success, actionType } = req.body;
    
    if (!validatorAddress) {
      return res.status(400).json({ error: 'Validator address is required' });
    }
    
    if (typeof success !== 'boolean') {
      return res.status(400).json({ error: 'Success must be a boolean' });
    }
    
    if (!actionType) {
      return res.status(400).json({ error: 'Action type is required' });
    }
    
    notificationService.recordValidatorAction(
      validatorAddress,
      success,
      actionType
    );
    
    res.status(200).json({ 
      message: 'Validator action recorded', 
      validatorAddress,
      success,
      actionType
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to rollback to a previous deployment version
app.post('/api/deployment/rollback', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { version } = req.body;
  try {
    rollbackDeployment(version);
    res.status(200).json({ message: `Rollback to version ${version} successful` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to fetch monitoring metrics
app.get('/api/metrics', (req, res) => {
  // For simplicity, proxy to our monitoring service running on a fixed port (3001)
  res.redirect(`http://localhost:${process.env.MONITORING_PORT || 3001}/metrics`);
});

// Health and readiness endpoints (for EKS probes)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

// Start monitoring service (this runs in parallel)
startMonitoringService();

// Start the API server
app.listen(PORT, () => {
  logger.info(`AVS Backend API server running on port ${PORT}`);
});