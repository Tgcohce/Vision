# AVS Backend System

This project is the backend for an AVS network compiler that transforms high-level design configurations into deployable artifacts. It integrates an IR compiler, a Hygen-based code generation engine, a deployment orchestrator, and monitoring modules. The system supports integrations with Othentic (governance/consensus), P2P messaging, Gaia (AI analysis), and Tangle (immutable logging).

## Frontend to Backend Integration

The system provides a specific endpoint for the frontend drag-and-drop interface to submit AVS designs. When a user designs an AVS by connecting blocks in the frontend, the design can be sent to the backend for processing, validation, and deployment.

### Frontend Design Format

The frontend should submit designs in the following format to `/api/frontend-design`:

```json
{
  "blocks": [
    {
      "id": "block_1",
      "type": "validator",
      "position": { "x": 100, "y": 200 },
      "properties": {
        "votingThreshold": 0.75
      }
    },
    {
      "id": "block_2",
      "type": "storage",
      "position": { "x": 300, "y": 200 },
      "properties": {
        "minValidators": 3
      }
    }
  ],
  "connections": [
    {
      "id": "conn_1",
      "sourceId": "block_1",
      "targetId": "block_2",
      "type": "control"
    }
  ]
}
```

The backend will:
1. Transform this frontend format to the backend IR format
2. Validate the design against the IR schema
3. Update the dependencies automatically based on connections
4. Save to the config.json file (preserving existing contract addresses)
5. Return the normalized IR design

### Block Types

Frontend block types are mapped to backend node types as follows:

| Frontend Type | Backend Type |
|---------------|--------------|
| validator     | governance   |
| storage       | attestation  |
| compute       | ai           |
| message       | p2p          |
| contract      | tangle       |

### Connection Types

Connections between blocks become:
1. Entries in the "connections" array
2. Automatically added to the "dependencies" array of each node

### Integration Flow

1. User creates a design in the drag-and-drop interface
2. Frontend submits the design to `/api/frontend-design`
3. Backend validates, normalizes, and saves the design
4. Frontend can trigger code generation with `/api/generate` 
5. Frontend can trigger deployment with `/api/deployment/deploy`

### One-Step Build and Deploy

For a streamlined experience, the frontend can use the `/api/frontend-build` endpoint, which handles the entire process in one API call:

```javascript
// Example frontend code to build and deploy an AVS
fetch('/api/frontend-build', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    design: {
      blocks: [
        // Design blocks
      ],
      connections: [
        // Connections between blocks
      ]
    },
    deployToEks: true // Optional flag to deploy to AWS EKS
  })
})
.then(response => response.json())
.then(data => {
  // data.deployedAddresses will contain the deployed contract addresses
  console.log('AVS deployed successfully:', data);
  
  // Display the governance contract address in the frontend
  const governanceAddress = data.deployedAddresses.governance;
  document.getElementById('contract-address').textContent = governanceAddress;
})
.catch(error => console.error('Deployment failed:', error));
```

This endpoint:
1. Accepts a frontend design and saves it to the config
2. Generates the code artifacts using Hygen templates
3. Creates a deployment manifest
4. Deploys the contracts to the Ethereum testnet
5. Optionally deploys off-chain components to Amazon EKS
6. Returns the updated configuration with deployed addresses

## Validator Monitoring and Notifications

The system includes a comprehensive validator monitoring and notification system:

1. **Event Tracking**: The system tracks blockchain events related to validators, including:
   - Task validations (success/failure)
   - Attestations (success/failure)
   - Stake deposits/withdrawals

2. **Performance Metrics**: Validator performance is tracked and available via the API:
   - Success rate
   - Number of successful/failed actions
   - Penalty points for failure

3. **Telegram Notifications**: The system can send notifications to Telegram:
   - Task validation results
   - Validator performance alerts
   - System status updates

4. **Automated Penalties**: Validators with poor performance accrue penalty points and receive warnings.

```javascript
// Example frontend code to display validator metrics
fetch('/api/validators/metrics', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
.then(response => response.json())
.then(data => {
  // Display validator metrics in the frontend
  const metrics = data.metrics;
  
  // Create a visual display of validator performance
  const validatorTable = document.getElementById('validator-table');
  metrics.forEach(validator => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${validator.address.substring(0, 6)}...${validator.address.substring(validator.address.length - 4)}</td>
      <td>${validator.successRate.toFixed(2)}%</td>
      <td>${validator.totalActions}</td>
      <td>${validator.penaltyPoints}</td>
      <td>${validator.penaltyPoints >= 5 ? '⚠️ At risk' : '✅ Good standing'}</td>
    `;
    validatorTable.appendChild(row);
  });
})
.catch(error => console.error('Failed to fetch validator metrics:', error));
```

## Project Structure

- **src/**: Application source code
  - **config/**: Configuration files including `config.json` which defines AVS nodes
  - **deploy/**: Deployment orchestration and simulation tools
    - **eks/**: Amazon EKS deployment configuration
  - **ir/**: IR compiler and schema definitions
  - **monitoring/**: Monitoring and logging services
  - **security/**: Authentication and authorization
  - **integrations/**: Integration with external services
    - **notificationService.js**: Telegram notifications and validator tracking
  - **codegen/**: Code generation utilities
- **_templates/**: Hygen templates for code generation
  - **ai/**: Templates for AI component generation
  - **p2p/**: Templates for P2P messaging components
  - **smart-contracts/**: Templates for smart contract generation
- **contracts/**: Smart contract source files
  - **TestGovernance.sol**: Sample governance contract for AVS
- **package.json**: Project metadata and dependencies

## Configuration

The system uses a central configuration file at `src/config/config.json` that defines:

- Network ID and environment
- Global defaults for timeouts and retry attempts
- Nodes (governance, attestation, p2p, AI, etc.) with their properties
- Connections between nodes

When contracts are deployed, the deployment orchestrator updates the configuration file with the deployed contract addresses in each node's `integration.contractAddress` field.

## Development

### Prerequisites

- Node.js 16 or higher
- NPM or Yarn
- Solidity compiler (for smart contract deployment)
- Web3 provider (for blockchain interaction)
- Optional: AWS CLI (for EKS deployment)

### Setup

```sh
# Install dependencies
npm install

# Set up environment variables
cp .env.sample .env
# Edit .env with your configuration
```

### Running the Server

```sh
# Start the backend server in development mode
npm start

# Start with production settings
npm run start:prod
```

## Deployment Process

The system follows these steps for deployment:

1. Validate the AVS design via the IR compiler
2. Generate code artifacts from templates
3. Deploy smart contracts to the blockchain
4. Update the configuration file with deployed addresses
5. Deploy off-chain components (if applicable)

### Deployment Commands

```sh
# Generate the deployment manifest
node src/deploy/manifestGenerator.js

# Deploy artifacts from the manifest
node src/deploy/deployOrchestrator.js

# Populate config with test addresses (for development/testing)
npm run config:test

# Run deployment with EKS integration
curl -X POST http://localhost:3000/api/frontend-build \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"deployToEks": true}'
```

## Troubleshooting

### Common Issues

- **Invalid Contract Address**: If you encounter the error `Error: Provided address 0xYourGovernanceContractAddress is invalid...`, it means the configuration file has not been updated with valid contract addresses. Run the following command to populate the config with test addresses for development:

```sh
npm run config:test
```

- **Manifest Not Found**: Make sure to generate the manifest before attempting deployment:

```sh
node src/deploy/manifestGenerator.js
```

- **Config File Not Found**: The deployment orchestrator expects the config file at `src/config/config.json`. Verify that this file exists and has the correct structure.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/frontend-design` | POST | Submit a frontend drag-and-drop design to be transformed into backend format |
| `/api/frontend-build` | POST | Submit a frontend design and deploy it to the Ethereum testnet with optional EKS deployment |
| `/api/design` | POST | Submit a backend-formatted design for validation |
| `/api/generate` | POST | Trigger code generation from the current design |
| `/api/deployment/preview` | GET | Preview deployment simulation |
| `/api/deployment/deploy` | POST | Trigger actual deployment |
| `/api/deployment/addresses` | GET | Get all deployed contract addresses |
| `/api/validators/metrics` | GET | Get validator performance metrics |
| `/api/validators/notifications` | GET | Get recent notifications |
| `/api/validators/action` | POST | Record a validator action (for testing) |
| `/api/notifications/test` | POST | Send a test notification to Telegram |
| `/api/metrics` | GET | Get monitoring metrics |
| `/health` | GET | Health check endpoint for EKS probes |
| `/ready` | GET | Readiness check endpoint for EKS probes |

## License

[MIT](LICENSE)