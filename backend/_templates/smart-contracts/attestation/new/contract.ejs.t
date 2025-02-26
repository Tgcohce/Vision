---
to: contracts/<%= name %>AttestationCenter.sol
---
pragma solidity ^0.8.20;

// SPDX-License-Identifier: BUSL-1.1

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ITaskFeeCalculator
 * @dev Interface for a fee calculator contract.
 */
interface ITaskFeeCalculator {
    function calculateFees(uint16 taskDefinitionId, uint256 amount) external view returns (uint256 feeAttesters, uint256 feePerformers, uint256 feeAggregators);
}

/**
 * @title <%= h.capitalize(name) %>AttestationCenter
 * @dev Attestation Center contract that bridges off-chain execution with on-chain verification,
 *      records task submissions, and manages task definitions.
 */
contract <%= h.capitalize(name) %>AttestationCenter is Ownable {
    // Structure defining task information
    struct TaskInfo {
        uint16 taskDefinitionId;
        string proofOfTask;   // e.g., a hash or signature string that off-chain attesters can verify
        bytes data;           // auxiliary metadata (could include inputs for SNARK proofs, etc.)
        address taskPerformer;
        bool signed;
    }

    // Structure for task submission details
    struct TaskSubmissionDetails {
        bool _isApproved;
        bytes _tpSignature;          // ECDSA signature from the Task Performer
        uint256[2] _taSignature;     // Aggregated BLS signature from Task Attesters
        uint256[] _operatorIds;      // IDs of participating operators
    }

    // Mapping from a task ID to its TaskInfo
    mapping(uint256 => TaskInfo) public tasks;
    uint256 public taskCounter;

    // Address of an optional fee calculator contract
    ITaskFeeCalculator public feeCalculator;

    // Events
    event TaskSubmitted(uint256 indexed taskId, address indexed taskPerformer, bool isApproved);
    event TaskDefinitionCreated(uint16 indexed taskDefinitionId, string definitionDetails);

    /**
     * @dev Sets the fee calculator contract address.
     * Can be updated later by the owner.
     */
    function setFeeCalculator(address _feeCalculator) external onlyOwner {
        feeCalculator = ITaskFeeCalculator(_feeCalculator);
    }

    /**
     * @dev Submits a task.
     * The process may include pre- and post-submission hooks in a full implementation.
     * @param _taskInfo The task information.
     * @param _taskSubmissionDetails The submission details including signatures.
     */
    function submitTask(TaskInfo calldata _taskInfo, TaskSubmissionDetails calldata _taskSubmissionDetails) external {
        require(!_taskInfo.signed, "Task already submitted");

        // Pre-processing hook can be added here (if external logic is set)

        // Validate the task's signature(s) and check for duplicate submission
        // (Actual signature verification logic to be implemented)

        // Calculate fees if feeCalculator is set
        if (address(feeCalculator) != address(0)) {
            (uint256 feeAttesters, uint256 feePerformers, uint256 feeAggregators) =
                feeCalculator.calculateFees(_taskInfo.taskDefinitionId, 1 ether);
            // Use these fees for rewards, slashing, etc. (not implemented in this MVP)
        }

        // Mark task as submitted
        taskCounter++;
        tasks[taskCounter] = TaskInfo({
            taskDefinitionId: _taskInfo.taskDefinitionId,
            proofOfTask: _taskInfo.proofOfTask,
            data: _taskInfo.data,
            taskPerformer: _taskInfo.taskPerformer,
            signed: true
        });

        emit TaskSubmitted(taskCounter, _taskInfo.taskPerformer, _taskSubmissionDetails._isApproved);

        // Post-processing hook can be added here (if external logic is set)
    }

    /**
     * @dev Creates a new task definition.
     * This allows the AVS developer to configure different types of tasks.
     * @param _taskDefinitionId The identifier for the new task definition.
     * @param _definitionDetails A string describing the task definition.
     */
    function createTaskDefinition(uint16 _taskDefinitionId, string calldata _definitionDetails) external onlyOwner {
        // In production, you'd store the task definition in a mapping or external registry.
        emit TaskDefinitionCreated(_taskDefinitionId, _definitionDetails);
    }
}
