'use strict';

require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const bodyParser = require('body-parser');
const { parseAndValidateDesign, normalizeDesign } = require('./ir/irCompiler');
const { generateFromIR } = require('./codegen/hygenWrapper');
const { deployArtifacts } = require('./deploy/deployOrchestrator');
const { simulateDeployment } = require('./deploy/simulateAndResolve');
const { rollbackDeployment } = require('./deploy/rollbackManager');
const { startMonitoringService } = require('./monitoring/monitoringService');
const { authenticateToken } = require('./security/auth');
const { authorizeRole } = require('./security/rbac');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Endpoint to submit a design and generate a normalized IR
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

// Start monitoring service (this runs in parallel)
startMonitoringService();

// Start the API server
app.listen(PORT, () => {
  console.log(`AVS Backend API server running on port ${PORT}`);
});
