"use client"

// Block types with their properties
export const BLOCK_TYPES = {
  VALIDATOR: {
    type: "validator",
    name: "Validator",
    color: "#7C3AED",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
    // "validates transactions and maintains consensus",
    inputs: ["data"],
    outputs: ["validation"],
  },
  STORAGE: {
    type: "storage",
    name: "comp 1",
    color: "#C59DD8",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
    // stores and retrieves data on-chain",
    inputs: ["write"],
    outputs: ["read"],
  },
  COMPUTE: {
    type: "compute",
    name: "comp 2",
    color: "#3E2C4A",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
    // performs complex computations off-chain",
    inputs: ["request"],
    outputs: ["result"],
  },
  ORACLE: {
    type: "oracle",
    name: "comp 3",
    color: "#2d16e9",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt", 
    // provides external data to the blockchain",
    inputs: ["query"],
    outputs: ["data"],
  },
  CONTRACT: {
    type: "contract",
    name: "comp 4",
    color: "#06091C",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
    // executes business logic on the blockchain",
    inputs: ["trigger"],
    outputs: ["execution"],
  },
}