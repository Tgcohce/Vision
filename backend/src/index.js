const express = require('express');
const bodyParser = require('body-parser');
const { parseAndValidateDesign, normalizeDesign } = require('./ir/irCompiler');
const { generateFromIR } = require('./codegen/hygenWrapper');
const { deployArtifacts } = require('./deploy/deployOrchestrator');
const { startMonitoringService } = require('./monitoring/monitoringService');
const { audit } = require('./security/auditLogger');
const { authenticateToken } = require('./security/auth');
const { authorizeRole } = require('./security/rbac');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

const { rollbackDeployment } = require('./deploy/rollbackManager');

app.post('/api/deployment/rollback', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { version } = req.body;
  try {
    rollbackDeployment(version);
    res.status(200).json({ message: `Rollback to version ${version} successful` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { simulateDeployment } = require('./deploy/simulation');

// Preview endpoint for deployment simulation
app.get('/api/deployment/preview', authenticateToken, authorizeRole('operator', 'admin'), (req, res) => {
  try {
    const report = simulateDeployment();
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to submit a design
app.post('/api/design', authenticateToken, (req, res) => {
  try {
    const design = req.body;
    const validatedDesign = parseAndValidateDesign(design);
    const ir = normalizeDesign(validatedDesign);
    // In a real implementation, store the IR in a database
    audit({ action: 'Design submitted', designId: ir.networkId });
    res.status(200).json({ message: 'Design validated and normalized', ir });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to trigger code generation
app.post('/api/generate', authenticateToken, authorizeRole('developer', 'admin'), async (req, res) => {
  try {
    // In a real scenario, the IR might be fetched from a database
    const design = require('./config/config.json');
    const ir = normalizeDesign(parseAndValidateDesign(design));
    await generateFromIR(ir);
    audit({ action: 'Code generated', networkId: ir.networkId });
    res.status(200).json({ message: 'Code generation successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to trigger deployment
app.post('/api/deploy', authenticateToken, authorizeRole('operator', 'admin'), async (req, res) => {
  try {
    await deployArtifacts();
    audit({ action: 'Deployment triggered' });
    res.status(200).json({ message: 'Deployment initiated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get monitoring metrics (can also be served separately)
app.get('/api/metrics', (req, res) => {
  // For simplicity, forward request to monitoring service
  // In a real scenario, you might proxy or aggregate metrics here
  res.redirect('http://localhost:3001/metrics');
});

// Start the monitoring service in parallel
startMonitoringService();

// Start the API server
app.listen(PORT, () => {
  console.log(`AVS Backend API server running on port ${PORT}`);
});
