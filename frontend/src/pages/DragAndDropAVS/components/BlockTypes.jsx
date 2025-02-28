"use client";

// Block types with their properties and subtypes
export const BLOCK_TYPES = {
  VALIDATOR: {
    type: "validator",
    name: "Validator",
    color: "#7C3AED",
    description: "Validates transactions and maintains consensus",
    inputs: ["data"],
    outputs: ["validation"],
    subtypes: {
      VALIDATOR_STANDARD: {
        name: "Standard Validator",
        description: "Standard validator for transaction validation",
        inputs: ["data"],
        outputs: ["validation"],
        color: "#7C3AED",
      },
      VALIDATOR_LIGHT: {
        name: "Light Validator",
        description: "Lightweight validator with reduced resource requirements",
        inputs: ["data"],
        outputs: ["validation"],
        color: "#9361FF",
      },
      VALIDATOR_ADVANCED: {
        name: "Advanced Validator",
        description: "Enhanced validator with advanced security features",
        inputs: ["data", "metadata"],
        outputs: ["validation", "analytics"],
        color: "#6429E0",
      },
      VALIDATOR_CUSTOM: {
        name: "Custom Validator",
        description: "Customizable validator for specialized validation rules",
        inputs: ["data", "rules"],
        outputs: ["validation", "report"],
        color: "#5B20D9",
      },
      VALIDATOR_NETWORK: {
        name: "Network Validator",
        description: "Validator optimized for network-wide consensus",
        inputs: ["data", "network_state"],
        outputs: ["validation", "status"],
        color: "#8A55F6",
      },
    },
  },
  STORAGE: {
    type: "storage",
    name: "Storage",
    color: "#C59DD8",
    description: "Stores and retrieves data on-chain",
    inputs: ["write"],
    outputs: ["read"],
    subtypes: {
      STORAGE_DISTRIBUTED: {
        name: "Distributed Storage",
        description: "Highly redundant data storage across multiple nodes",
        inputs: ["write"],
        outputs: ["read"],
        color: "#C59DD8",
      },
      STORAGE_ENCRYPTED: {
        name: "Encrypted Storage",
        description: "Secure storage with end-to-end encryption",
        inputs: ["write", "key"],
        outputs: ["read"],
        color: "#D4B7E3",
      },
      STORAGE_LIGHTWEIGHT: {
        name: "Lightweight Storage",
        description: "Optimized for small data with fast access",
        inputs: ["write"],
        outputs: ["read", "status"],
        color: "#B683CD",
      },
      STORAGE_ARCHIVE: {
        name: "Archive Storage",
        description: "Long-term data storage with compression",
        inputs: ["write", "metadata"],
        outputs: ["read", "archive_info"],
        color: "#A769C2",
      },
    },
  },
  COMPUTE: {
    type: "compute",
    name: "Compute",
    color: "#3E2C4A",
    description: "Performs complex computations off-chain",
    inputs: ["request"],
    outputs: ["result"],
    subtypes: {
      COMPUTE_STANDARD: {
        name: "Standard Compute",
        description: "General-purpose computation node",
        inputs: ["request"],
        outputs: ["result"],
        color: "#3E2C4A",
      },
      COMPUTE_GPU: {
        name: "GPU Compute",
        description: "GPU-accelerated computation for parallel tasks",
        inputs: ["request", "parameters"],
        outputs: ["result", "metrics"],
        color: "#4E3A5A",
      },
      COMPUTE_SPECIALIZED: {
        name: "Specialized Compute",
        description: "Domain-specific computation with optimized algorithms",
        inputs: ["request", "config"],
        outputs: ["result", "analysis"],
        color: "#2E1E3A",
      },
      COMPUTE_SECURE: {
        name: "Secure Compute",
        description: "Computation with privacy-preserving techniques",
        inputs: ["request", "encryption_key"],
        outputs: ["result"],
        color: "#5D4669",
      },
    },
  },
  ORACLE: {
    type: "oracle",
    name: "Oracle",
    color: "#2d16e9",
    description: "Provides external data to the blockchain",
    inputs: ["query"],
    outputs: ["data"],
    subtypes: {
      ORACLE_PRICE: {
        name: "Price Oracle",
        description: "Provides real-time price data for assets",
        inputs: ["query"],
        outputs: ["price_data"],
        color: "#2d16e9",
      },
      ORACLE_WEATHER: {
        name: "Weather Oracle",
        description: "Delivers weather data and forecasts",
        inputs: ["query", "location"],
        outputs: ["weather_data"],
        color: "#4933F0",
      },
      ORACLE_SPORTS: {
        name: "Sports Oracle",
        description: "Provides sports scores and statistics",
        inputs: ["query", "event_id"],
        outputs: ["sports_data"],
        color: "#1B0AB9",
      },
      ORACLE_DEFI: {
        name: "DeFi Oracle",
        description: "Specialized oracle for DeFi protocols",
        inputs: ["query", "protocol"],
        outputs: ["defi_data", "risk_metrics"],
        color: "#3B27E2",
      },
    },
  },
  CONTRACT: {
    type: "contract",
    name: "Contract",
    color: "#06091C",
    description: "Executes business logic on the blockchain",
    inputs: ["trigger"],
    outputs: ["execution"],
    subtypes: {
      CONTRACT_STANDARD: {
        name: "Standard Contract",
        description: "General-purpose smart contract",
        inputs: ["trigger"],
        outputs: ["execution"],
        color: "#06091C",
      },
      CONTRACT_UPGRADEABLE: {
        name: "Upgradeable Contract",
        description: "Smart contract with upgrade capabilities",
        inputs: ["trigger", "admin_action"],
        outputs: ["execution", "status"],
        color: "#161C36",
      },
      CONTRACT_MULTISIG: {
        name: "Multisig Contract",
        description: "Contract requiring multiple signatures",
        inputs: ["trigger", "signatures"],
        outputs: ["execution", "approval_status"],
        color: "#0C102A",
      },
      CONTRACT_TIMELOCK: {
        name: "Timelock Contract",
        description: "Contract with time-delayed execution",
        inputs: ["trigger", "schedule"],
        outputs: ["execution", "pending_actions"],
        color: "#242848",
      },
    },
  },

  // Example of adding Othentic-based "Governance"
  GOVERNANCE: {
    type: "governance",
    name: "Othentic Governance",
    color: "#FF5733",
    description: "Manages operator registration, staking, and consensus logic (Othentic integration)",
    inputs: ["operator_registration", "governance_params"],
    outputs: ["governance_events", "rewards_distribution"],
    subtypes: {
      GOVERNANCE_STANDARD: {
        name: "Standard Governance",
        description: "Basic operator registration and governance logic using Othentic hooks",
        inputs: ["operator_registration"],
        outputs: ["governance_events"],
        color: "#FF5733",
      },
      GOVERNANCE_ENHANCED: {
        name: "Enhanced Governance",
        description: "Advanced governance logic with pre/post execution hooks for operator registration",
        inputs: ["operator_registration", "custom_logic"],
        outputs: ["governance_events", "analytics"],
        color: "#C70039",
      },
    },
  },

  // Example of adding AI / Gaia integration
  AI: {
    type: "ai",
    name: "AI Integration",
    color: "#2ecc71",
    description: "Provides advanced AI analytics or anomaly detection (Gaia integration)",
    inputs: ["data"],
    outputs: ["analytics"],
    subtypes: {
      GAIA_STANDARD: {
        name: "Gaia Standard AI",
        description: "Uses Gaia for basic anomaly detection and analytics",
        inputs: ["data"],
        outputs: ["analytics"],
        color: "#27ae60",
      },
      GAIA_ADVANCED: {
        name: "Gaia Advanced AI",
        description: "Advanced AI with deeper insights and adaptive learning",
        inputs: ["data", "metadata"],
        outputs: ["analytics", "insights"],
        color: "#229954",
      },
    },
  },
};

// Helper function to get a specific subtype
export const getBlockSubtype = (blockType, subType) => {
  if (!blockType || !subType) return null;

  const mainType = BLOCK_TYPES[blockType];
  if (!mainType) return null;

  return mainType.subtypes && mainType.subtypes[subType]
    ? mainType.subtypes[subType]
    : mainType;
};

// Helper function to get block info by type (either main type or subtype)
export const getBlockInfo = (blockType, subType) => {
  if (subType) {
    const subTypeInfo = getBlockSubtype(blockType, subType);
    if (subTypeInfo) return subTypeInfo;
  }
  return BLOCK_TYPES[blockType] || null;
};
