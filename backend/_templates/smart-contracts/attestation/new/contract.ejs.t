---
to: contracts/<%= name %>Attestation.sol
---
pragma solidity ^0.8.0;

/**
 * @title <%= h.capitalize(name) %>Attestation
 * @dev Contract for collecting and validating task attestations.
 */
contract <%= h.capitalize(name) %>Attestation {
    uint256 public minValidators;

    // Mapping taskId to aggregated validation result.
    mapping(uint256 => bool) public taskResults;
    // Mapping taskId to count of validations received.
    mapping(uint256 => uint256) public taskValidationCount;

    // Event for attestation.
    event TaskAttested(uint256 indexed taskId, address indexed validator, bool success, uint256 timestamp);

    /**
     * @dev Initializes the contract with the minimum number of validators required.
     */
    constructor(uint256 _minValidators) {
        require(_minValidators > 0, "Minimum validators must be greater than 0");
        minValidators = _minValidators;
    }

    /**
     * @dev Submit an attestation for a given task.
     * @param taskId The identifier of the task.
     * @param success The attestation result.
     */
    function attestTask(uint256 taskId, bool success) external {
        // In production, add checks to ensure msg.sender is a recognized validator.
        taskValidationCount[taskId] += 1;

        // Once the threshold is met, record the result.
        if (taskValidationCount[taskId] >= minValidators) {
            taskResults[taskId] = success;
        }
        emit TaskAttested(taskId, msg.sender, success, block.timestamp);
    }
}
