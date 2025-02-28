# AVS Backend System

This project is the backend for an AVS network compiler that transforms high-level design configurations into deployable artifacts. It integrates an IR compiler, a Hygen-based code generation engine, a deployment orchestrator, and monitoring modules. The system supports integrations with Othentic (governance/consensus), P2P messaging, Gaia (AI analysis), and Tangle (immutable logging).

## Project Structure

- **src/**: Application source code
  - **config/**: Configuration files including `config.json` which defines AVS nodes
  - **deploy/**: Deployment orchestration and simulation tools
  - **ir/**: IR compiler and schema definitions
  - **monitoring/**: Monitoring and logging services
  - **security/**: Authentication and authorization
  - **integrations/**: Integration with external services
  - **codegen/**: Code generation utilities
- **_templates/**: Hygen templates for code generation
  - **ai/**: Templates for AI component generation
  - **p2p/**: Templates for P2P messaging components
  - **smart-contracts/**: Templates for smart contract generation
- **contracts/**: Smart contract source files
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
# Start the backend server
npm start
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
node src/deploy/populateConfig.js [--overwrite]
```

## Troubleshooting

### Common Issues

- **Invalid Contract Address**: If you encounter the error `Error: Provided address 0xYourGovernanceContractAddress is invalid...`, it means the configuration file has not been updated with valid contract addresses. Run the following command to populate the config with test addresses for development:

```sh
node src/deploy/populateConfig.js
```

- **Manifest Not Found**: Make sure to generate the manifest before attempting deployment:

```sh
node src/deploy/manifestGenerator.js
```

- **Config File Not Found**: The deployment orchestrator expects the config file at `src/config/config.json`. Verify that this file exists and has the correct structure.

## License

[MIT](LICENSE)