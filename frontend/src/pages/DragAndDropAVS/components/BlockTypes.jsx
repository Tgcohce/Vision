"use client";

// Block types with their properties, subtypes, and integration examples
export const BLOCK_TYPES = {
  OPERATOR_ACTION: { // Renamed from VALIDATOR
    type: "operator_action",
    name: "Operator Action",
    color: "#7C3AED",
    description: "Represents actions performed by operators (e.g., validations, penalties, consensus decisions)",
    inputs: ["data"],
    outputs: ["action"],
    subtypes: {
      OPERATOR_STANDARD: {
        name: "Standard Operator Action",
        description: "Basic operator actions for transaction validation",
        inputs: ["data"],
        outputs: ["action"],
        color: "#7C3AED",
      },
      OPERATOR_LIGHT: {
        name: "Light Operator Action",
        description: "Lightweight operator action with reduced resource usage",
        inputs: ["data"],
        outputs: ["action"],
        color: "#9361FF",
      },
      OPERATOR_ADVANCED: {
        name: "Advanced Operator Action",
        description: "Enhanced operator actions with additional security features",
        inputs: ["data", "metadata"],
        outputs: ["action", "analytics"],
        color: "#6429E0",
      },
      OPERATOR_CUSTOM: {
        name: "Custom Operator Action",
        description: "Customizable operator actions for specialized scenarios",
        inputs: ["data", "rules"],
        outputs: ["action", "report"],
        color: "#5B20D9",
      },
      OPERATOR_NETWORK: {
        name: "Network Operator Action",
        description: "Operator actions optimized for network-wide consensus and control",
        inputs: ["data", "network_state"],
        outputs: ["action", "status"],
        color: "#8A55F6",
      },
    }
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
    }
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
    }
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
    }
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
    }
  },
  GOVERNANCE: {
    type: "governance",
    name: "Othentic Governance",
    color: "#FF5733",
    description: "Manages operator registration, staking, and consensus using Othentic protocols",
    inputs: ["operator_registration", "governance_params"],
    outputs: ["governance_events", "rewards_distribution"],
    subtypes: {
      GOVERNANCE_STANDARD: {
        name: "Standard Governance",
        description: "Basic operator registration and governance logic using Othentic hooks",
        inputs: ["operator_registration"],
        outputs: ["governance_events"],
        color: "#FF5733"
      },
      GOVERNANCE_ENHANCED: {
        name: "Enhanced Governance",
        description: "Advanced governance with pre/post execution hooks for operator registration",
        inputs: ["operator_registration", "custom_logic"],
        outputs: ["governance_events", "analytics"],
        color: "#C70039"
      }
    }
  },
  CUSTOM_BLOCK: {
    type: "custom_block",
    name: "Custom Code Block",
    color: "#FFD700", 
    description: "Block that allows you to paste or write custom code or logic.",
    inputs: ["input"],
    outputs: ["output"],
    // logic here almost done... need to connect with a subtype to allow for code input 
  },
  AI: {
    type: "ai",
    name: "AI Integration",
    color: "#2ecc71",
    description: "Provides advanced AI analytics and anomaly detection via Gaia integration",
    inputs: ["data"],
    outputs: ["analytics"],
    subtypes: {
      GAIA_STANDARD: {
        name: "Gaia Standard AI",
        description: "Standard anomaly detection and analytics using Gaia",
        inputs: ["data"],
        outputs: ["analytics"],
        color: "#27ae60"
      },
      GAIA_ADVANCED: {
        name: "Gaia Advanced AI",
        description: "Enhanced AI integration with deeper insights and adaptive learning",
        inputs: ["data", "metadata"],
        outputs: ["analytics", "insights"],
        color: "#229954"
      }
    }
  },
  MESSAGE_HANDLER_L1: {
    type: "l1_message_handler",
    name: "Othentic L1 Message Handler",
    color: "#FF8C00",
    description: "Handles cross-chain messages from L2 to L1 (e.g., operator updates, payment notifications)",
    inputs: ["L2 message"],
    outputs: ["notification"],
    subtypes: {
      MESSAGE_HANDLER_L1_STANDARD: {
        name: "Standard L1 Handler",
        description: "Standard handler for L2-to-L1 message processing",
        inputs: ["L2 message"],
        outputs: ["notification"],
        color: "#FF8C00"
      }
    }
  },
  MESSAGE_HANDLER_L2: {
    type: "l2_message_handler",
    name: "Othentic L2 Message Handler",
    color: "#FF4500",
    description: "Handles cross-chain messages from L1 to L2 (e.g., forwarding payment or slashing requests)",
    inputs: ["L1 message"],
    outputs: ["notification"],
    subtypes: {
      MESSAGE_HANDLER_L2_STANDARD: {
        name: "Standard L2 Handler",
        description: "Standard handler for L1-to-L2 message processing",
        inputs: ["L1 message"],
        outputs: ["notification"],
        color: "#FF4500"
      }
    }
  },
  ATTESTATION_CENTER: {
    type: "attestation_center",
    name: "Attestation Center",
    color: "#2F4F4F",
    description: "Records task submissions, verifies execution on-chain, and manages rewards/penalties",
    inputs: ["task submission"],
    outputs: ["task validation"],
    subtypes: {
      ATTESTATION_CENTER_STANDARD: {
        name: "Standard Attestation Center",
        description: "Handles task verification and event recording",
        inputs: ["task submission"],
        outputs: ["task validation"],
        color: "#2F4F4F"
      }
    }
  },
  P2P_ENERGY: {
    type: "p2p_energy",
    name: "P2P Energy Trading",
    color: "#20B2AA", // pick any color
    description: "Smart contracts for trading renewable energy in a grid-connected microgrid using Ethereum.",
    inputs: ["tradeRequest"],
    outputs: ["tradeSettlement"],
    subtypes: {
      CLEARING: {
        name: "Clearing Contract",
        description: "Handles the clearing logic for energy trades. See Clearing.sol.",
        inputs: ["clearData"],
        outputs: ["clearedTrades"],
        color: "#20B2AA"
      },
      DOUBLE_SIDED_AUCTION: {
        name: "Double-sided Auction",
        description: "Implements an auction mechanism for energy trades. See Double-sidedAuction.sol.",
        inputs: ["auctionData"],
        outputs: ["auctionResults"],
        color: "#20B2AA"
      },
      ERC20: {
        name: "ERC20 Contract",
        description: "An ERC20 token contract for P2P Energy Trading. See ERC20.sol.",
        inputs: ["tokenTx"],
        outputs: ["tokenBalance"],
        color: "#20B2AA"
      }
    }
  },
  VOLATILITY: {
    type: "volatility",
    name: "Uniswap Volatility",
    color: "#8B5CF6", 
    description: "A specialized Uniswap V4 hook that manages dynamic LP fees based on volatility over time.",
    inputs: ["manager", "poolKey"],
    outputs: ["dynamic_fee"],
    subtypes: {
      VOLATILITY_ORACLE: {
        name: "Volatility Oracle Hook",
        description: "A Uniswap V4 hook that calculates and updates LP fees dynamically. See VolatilityOracle.sol.",
        inputs: ["manager", "poolKey"],
        outputs: ["dynamic_fee"],
        color: "#8B5CF6"
      }
    }
  },
  REGISTRY: {
    type: "registry",
    name: "Othentic Registry",
    color: "#4B0082",
    description: "Singleton contract that manages AVS governance registration and integration with shared security protocols",
    inputs: ["registration"],
    outputs: ["governance"],
    subtypes: {
      REGISTRY_STANDARD: {
        name: "Standard Registry",
        description: "Manages registration of AVS governance contracts",
        inputs: ["registration"],
        outputs: ["governance"],
        color: "#4B0082"
      }
    }
  },
  TRIGGER: {
    type: "trigger",
    name: "Offchain Trigger",
    color: "#F39C12",
    description: "Executes off-chain actions such as sending alerts and penalizing operators",
    inputs: ["event"],
    outputs: ["action"],
    subtypes: {
      TELEGRAM_ALERT: {
        name: "Telegram Alert",
        description: "Sends a Telegram message for critical events",
        inputs: ["event"],
        outputs: ["notification"],
        color: "#F39C12"
      },
      EMAIL_NOTIFICATION: {
        name: "Email Notification",
        description: "Sends an email alert for critical events",
        inputs: ["event"],
        outputs: ["notification"],
        color: "#E67E22"
      },
      OPERATOR_PENALTY: {
        name: "Operator Penalty",
        description: "Triggers a penalty action for misbehaving operators, visually indicating the issue",
        inputs: ["operator", "penalty_details"],
        outputs: ["penalty_execution"],
        color: "#C0392B"
      }
    }
  }
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
