'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { logger } = require('../monitoring/logger');

/**
 * Deploy to Amazon EKS
 * @param {Object} config - Configuration with contract addresses
 * @returns {Promise<boolean>} - Success status
 */
async function deployToEKS(config) {
  logger.info('Starting EKS deployment');
  
  try {
    // Create temporary deployment YAML with updated addresses
    const deploymentYaml = createDeploymentYaml(config);
    const tempYamlPath = path.join(process.cwd(), 'dist', 'eks-deployment.yaml');
    
    // Write the deployment file
    fs.writeFileSync(tempYamlPath, deploymentYaml);
    logger.info(`EKS deployment YAML written to ${tempYamlPath}`);
    
    // Execute kubectl apply (AWS EKS deployment)
    return new Promise((resolve, reject) => {
      exec(`kubectl apply -f ${tempYamlPath}`, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Error deploying to EKS: ${error.message}`);
          reject(error);
          return;
        }
        
        logger.info(`EKS deployment output: ${stdout}`);
        if (stderr) {
          logger.warn(`EKS deployment warnings: ${stderr}`);
        }
        
        logger.info('EKS deployment completed successfully');
        resolve(true);
      });
    });
  } catch (error) {
    logger.error(`EKS deployment failed: ${error.message}`);
    throw error;
  }
}

/**
 * Create a deployment YAML with correct contract addresses
 * @param {Object} config - Configuration with contract addresses
 * @returns {string} - The deployment YAML content
 */
function createDeploymentYaml(config) {
  logger.info('Creating EKS deployment YAML with contract addresses');
  
  // Get addresses for ConfigMap
  const addresses = {};
  config.nodes.forEach(node => {
    if (node.integration && node.integration.contractAddress) {
      addresses[`${node.type}_contract_address`] = node.integration.contractAddress;
    }
  });
  
  // Read the template
  const templatePath = path.join(process.cwd(), 'src', 'deploy', 'eks', 'deployment.yaml');
  let yamlContent = fs.readFileSync(templatePath, 'utf8');
  
  // Replace placeholders with actual values
  Object.entries(addresses).forEach(([key, value]) => {
    yamlContent = yamlContent.replace(new RegExp(`\\$\\{${key.toUpperCase()}\\}`, 'g'), value);
  });
  
  return yamlContent;
}

/**
 * Get status of EKS deployment
 * @returns {Promise<Object>} - Status information
 */
async function getEKSDeploymentStatus() {
  return new Promise((resolve, reject) => {
    exec('kubectl get deployments avs-offchain-service -o json', (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error getting EKS status: ${error.message}`);
        resolve({ deployed: false, error: error.message });
        return;
      }
      
      try {
        const status = JSON.parse(stdout);
        resolve({
          deployed: true,
          availableReplicas: status.status.availableReplicas || 0,
          readyReplicas: status.status.readyReplicas || 0,
          replicas: status.status.replicas || 0,
          updatedReplicas: status.status.updatedReplicas || 0,
          conditions: status.status.conditions || []
        });
      } catch (parseError) {
        logger.error(`Error parsing EKS status: ${parseError.message}`);
        resolve({ deployed: false, error: parseError.message });
      }
    });
  });
}

module.exports = {
  deployToEKS,
  getEKSDeploymentStatus
};