import { ethers } from 'ethers';

// Interface ABI for IOperatorAllowlist functions we need
const operatorAllowlistABI = [
  // View functions
  "function isWhitelisted(address operator) external view returns (bool)",
  "function isAllowed(address operator) external view returns (bool)",
  "function isRegistered(address operator) external view returns (bool)",
  "function getBeneficiary(address operator) external view returns (address)",
  "function getDepositAmount(address operator) external view returns (uint256)",
  "function hasWithdrawn(address operator) external view returns (bool)",
  
  // Admin functions
  "function whitelistOperator(address operator) external",
  "function whitelistOperators(address[] calldata operators) external",
  "function unwhitelistOperator(address operator) external",
  "function unwhitelistOperators(address[] calldata operators) external",
  
  // Public functions
  "function register(address payable beneficiary) external payable",
  "function withdraw() external",

  // Events
  "event OperatorWhitelisted(address operator)",
  "event OperatorUnwhitelisted(address operator)",
  "event OperatorRegistered(address operator, uint256 amount, address beneficiary)",
  "event OperatorWithdrawn(address operator, uint256 amount, address beneficiary)"
];

/**
 * Create a new contract instance
 * @param {string} contractAddress - The address of the deployed contract
 * @param {Object} signer - The ethers signer or provider
 * @returns {ethers.Contract} The contract instance
 */
export const getOperatorAllowlistContract = (contractAddress, signerOrProvider) => {
  return new ethers.Contract(contractAddress, operatorAllowlistABI, signerOrProvider);
};

/**
 * Check if an operator is whitelisted
 * @param {ethers.Contract} contract - The contract instance
 * @param {string} operatorAddress - The operator address to check
 * @returns {Promise<boolean>} True if the operator is whitelisted
 */
export const isOperatorWhitelisted = async (contract, operatorAddress) => {
  return await contract.isWhitelisted(operatorAddress);
};

/**
 * Check if an operator is registered
 * @param {ethers.Contract} contract - The contract instance
 * @param {string} operatorAddress - The operator address to check
 * @returns {Promise<boolean>} True if the operator is registered
 */
export const isOperatorRegistered = async (contract, operatorAddress) => {
  return await contract.isRegistered(operatorAddress);
};

/**
 * Whitelist an operator (admin only)
 * @param {ethers.Contract} contract - The contract instance
 * @param {string} operatorAddress - The operator address to whitelist
 * @returns {Promise<ethers.ContractTransaction>} The transaction
 */
export const whitelistOperator = async (contract, operatorAddress) => {
  return await contract.whitelistOperator(operatorAddress);
};

/**
 * Whitelist multiple operators (admin only)
 * @param {ethers.Contract} contract - The contract instance
 * @param {string[]} operatorAddresses - Array of operator addresses to whitelist
 * @returns {Promise<ethers.ContractTransaction>} The transaction
 */
export const whitelistOperators = async (contract, operatorAddresses) => {
  return await contract.whitelistOperators(operatorAddresses);
};

/**
 * Unwhitelist an operator (admin only)
 * @param {ethers.Contract} contract - The contract instance
 * @param {string} operatorAddress - The operator address to unwhitelist
 * @returns {Promise<ethers.ContractTransaction>} The transaction
 */
export const unwhitelistOperator = async (contract, operatorAddress) => {
  return await contract.unwhitelistOperator(operatorAddress);
};

/**
 * Register as an operator (must be whitelisted first)
 * @param {ethers.Contract} contract - The contract instance
 * @param {string} beneficiaryAddress - The address to receive payouts or withdrawals
 * @param {string|BigNumber} depositAmount - The amount to deposit in wei
 * @returns {Promise<ethers.ContractTransaction>} The transaction
 */
export const registerOperator = async (contract, beneficiaryAddress, depositAmount) => {
  return await contract.register(beneficiaryAddress, { value: depositAmount });
};

/**
 * Withdraw operator deposit
 * @param {ethers.Contract} contract - The contract instance
 * @returns {Promise<ethers.ContractTransaction>} The transaction
 */
export const withdrawOperatorDeposit = async (contract) => {
  return await contract.withdraw();
};

/**
 * Get operator details
 * @param {ethers.Contract} contract - The contract instance
 * @param {string} operatorAddress - The operator address to check
 * @returns {Promise<Object>} Object containing operator status
 */
export const getOperatorStatus = async (contract, operatorAddress) => {
  const [isWhitelisted, isRegistered, beneficiary, depositAmount, hasWithdrawn] = await Promise.all([
    contract.isWhitelisted(operatorAddress),
    contract.isRegistered(operatorAddress),
    contract.getBeneficiary(operatorAddress),
    contract.getDepositAmount(operatorAddress),
    contract.hasWithdrawn(operatorAddress)
  ]);

  return {
    address: operatorAddress,
    isWhitelisted,
    isRegistered,
    beneficiary,
    depositAmount: ethers.utils.formatEther(depositAmount),
    hasWithdrawn
  };
};