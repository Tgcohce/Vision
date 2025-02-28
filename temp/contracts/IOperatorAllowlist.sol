// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title Interface for the OperatorAllowlist contract
 * @author Alt Research
 * @notice This interface specifies the functions that a operator allow list contract must implement to be compatible with the rest of the Alt Research contract ecosystem.
 */
interface IOperatorAllowlist {
    struct TokenInfo {
        bool isReady;
        bool deployed;
        bool delegatable;
        address tokenContract;
        uint256 tokenId;
        address owner;
    }

    struct OperatorInfo {
        bool isAllowed;
        bool isRegistered;
        bool hasWithdrawn;
        address payable beneficiary;
        uint256 depositAmount;
    }

    struct ProofInfo {
        bool isActive;
        string proofId;
        address submitter;
        uint256 timestamp;
    }

    /**
     * @notice Called when an operator is whitelisted
     * @param operator The address of the whitelisted operator
     */
    event OperatorWhitelisted(address operator);

    /**
     * @notice Called when an operator is unwhitelisted
     * @param operator The address of the unwhitelisted operator
     */
    event OperatorUnwhitelisted(address operator);

    /**
     * @notice Called when an operator registers/deposits
     * @param operator The address of the operator that registers/deposits
     * @param amount The amount deposited by the operator
     * @param beneficiary The address that will receive payouts or withdrawal funds
     */
    event OperatorRegistered(address operator, uint256 amount, address beneficiary);

    /**
     * @notice Called when an operator withdraws
     * @param operator The address of the operator that withdraws
     * @param amount The amount withdrawn by the operator
     * @param beneficiary The address that received the withdrawn funds
     */
    event OperatorWithdrawn(address operator, uint256 amount, address beneficiary);

    /**
     * @notice Called when a token is registered
     * @param tokenContract The address of the token contract
     * @param tokenId The id of the token
     * @param owner The address of the token owner
     */
    event TokenRegistered(address tokenContract, uint256 tokenId, address owner);

    /**
     * @notice Called when a token is updated
     * @param tokenContract The address of the token contract
     * @param tokenId The id of the token
     * @param owner The address of the token owner
     * @param deployed Whether the token is deployed
     * @param delegatable Whether the token is delegatable
     */
    event TokenUpdated(
        address tokenContract,
        uint256 tokenId,
        address owner,
        bool deployed,
        bool delegatable
    );

    /**
     * @notice Called when a proof is submitted
     * @param proofId The id of the proof
     * @param submitter The address of the submitter
     */
    event ProofSubmitted(string proofId, address submitter);

    /**
     * @notice Called when a proof is activated
     * @param proofId The id of the proof
     */
    event ProofActivated(string proofId);

    /**
     * @notice Called when a proof is deactivated
     * @param proofId The id of the proof
     */
    event ProofDeactivated(string proofId);

    /** Getters / views */

    /**
     * @notice Returns whether an operator is whitelisted
     * @param operator The address of the operator to check
     * @return Whether the operator is whitelisted
     */
    function isWhitelisted(address operator) external view returns (bool);

    /**
     * @notice Returns whether an operator is allowed to register
     * @param operator The address of the operator to check
     * @return Whether the operator is allowed to register
     */
    function isAllowed(address operator) external view returns (bool);

    /**
     * @notice Returns whether an operator is registered
     * @param operator The address of the operator to check
     * @return Whether the operator is registered
     */
    function isRegistered(address operator) external view returns (bool);

    /**
     * @notice Returns the beneficiary of an operator
     * @param operator The address of the operator to check
     * @return The beneficiary of the operator
     */
    function getBeneficiary(address operator) external view returns (address);

    /**
     * @notice Returns the deposit amount of an operator
     * @param operator The address of the operator to check
     * @return The deposit amount of the operator
     */
    function getDepositAmount(address operator) external view returns (uint256);

    /**
     * @notice Returns whether an operator has withdrawn
     * @param operator The address of the operator to check
     * @return Whether the operator has withdrawn
     */
    function hasWithdrawn(address operator) external view returns (bool);

    /**
     * @notice Gets all information about an operator
     * @param operator The address of the operator to check
     * @return The operator info
     */
    function getOperatorInfo(address operator) external view returns (OperatorInfo memory);

    /**
     * @notice Gets all information about a token
     * @param tokenContract The address of the token contract
     * @param tokenId The id of the token
     * @return The token info
     */
    function getTokenInfo(
        address tokenContract,
        uint256 tokenId
    ) external view returns (TokenInfo memory);

    /**
     * @notice Checks if a proof is active
     * @param proofId The id of the proof to check
     * @return Whether the proof is active
     */
    function isProofActive(string calldata proofId) external view returns (bool);

    /**
     * @notice Gets all information about a proof
     * @param proofId The id of the proof to check
     * @return The proof info
     */
    function getProofInfo(string calldata proofId) external view returns (ProofInfo memory);

    /** Owner / admin functions */

    /**
     * @notice Adds an operator to the allowlist
     * @param operator The address of the operator to add
     */
    function whitelistOperator(address operator) external;

    /**
     * @notice Adds multiple operators to the allowlist
     * @param operators The addresses of the operators to add
     */
    function whitelistOperators(address[] calldata operators) external;

    /**
     * @notice Removes an operator from the allowlist
     * @param operator The address of the operator to remove
     */
    function unwhitelistOperator(address operator) external;

    /**
     * @notice Removes multiple operators from the allowlist
     * @param operators The addresses of the operators to remove
     */
    function unwhitelistOperators(address[] calldata operators) external;

    /**
     * @notice Registers a token
     * @param tokenContract The address of the token contract
     * @param tokenId The id of the token
     * @param owner The address of the token owner
     */
    function registerToken(address tokenContract, uint256 tokenId, address owner) external;

    /**
     * @notice Updates a token
     * @param tokenContract The address of the token contract
     * @param tokenId The id of the token
     * @param owner The address of the token owner
     * @param deployed Whether the token is deployed
     * @param delegatable Whether the token is delegatable
     */
    function updateToken(
        address tokenContract,
        uint256 tokenId,
        address owner,
        bool deployed,
        bool delegatable
    ) external;

    /**
     * @notice Activates a proof
     * @param proofId The id of the proof to activate
     */
    function activateProof(string calldata proofId) external;

    /**
     * @notice Deactivates a proof
     * @param proofId The id of the proof to deactivate
     */
    function deactivateProof(string calldata proofId) external;

    /** Public functions */

    /**
     * @notice Registers an operator
     * @param beneficiary The address that will receive payouts or withdrawal funds
     */
    function register(address payable beneficiary) external payable;

    /**
     * @notice Withdraws an operator's deposit
     */
    function withdraw() external;

    /**
     * @notice Submits a proof
     * @param proofId The id of the proof to submit
     */
    function submitProof(string calldata proofId) external;
}