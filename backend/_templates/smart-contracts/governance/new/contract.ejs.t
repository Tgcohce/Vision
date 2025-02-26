---
to: contracts/<%= name %>.sol
---
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IAvsGovernanceLogic.sol";

/**
 * @title <%= h.capitalize(name) %>
 * @dev Governance contract for operator management that integrates Othentic’s hooks.
 */
contract <%= h.capitalize(name) %> is Ownable {
    // Governance parameters provided by the user
    uint256 public numOfOperatorsLimit;
    uint256 public slashingRate;
    string public avsName;
    address public avsGovernanceMultisig;
    IAvsGovernanceLogic public avsGovernanceLogic;

    // Mapping to track registered operators and their shares
    mapping(address => uint256) public operatorShares;

    // Events
    event OperatorRegistered(address indexed operator, uint256 numOfShares);
    event OperatorUnregistered(address indexed operator);

    /**
     * @dev Initializes the governance contract.
     * @param _numOfOperatorsLimit Maximum allowed operators.
     * @param _slashingRate Slashing rate in wei.
     * @param _avsName Human-readable AVS name.
     * @param _avsGovernanceMultisig Address of the governance multisig.
     */
    constructor(
        uint256 _numOfOperatorsLimit,
        uint256 _slashingRate,
        string memory _avsName,
        address _avsGovernanceMultisig
    ) {
        numOfOperatorsLimit = _numOfOperatorsLimit > 0 ? _numOfOperatorsLimit : uint256(+(process.env.DEFAULT_OPERATOR_LIMIT || "100"));
        slashingRate = _slashingRate > 0 ? _slashingRate : uint256(+(process.env.DEFAULT_SLASHING_RATE || "1000"));
        avsName = bytes(_avsName).length > 0 ? _avsName : process.env.DEFAULT_AVS_NAME;
        avsGovernanceMultisig = _avsGovernanceMultisig;
    }

    /**
     * @dev Sets the governance logic contract address.
     * Can only be called by the governance multisig.
     */
    function setAvsGovernanceLogic(address _logic) external {
        require(msg.sender == avsGovernanceMultisig, "Not authorized");
        avsGovernanceLogic = IAvsGovernanceLogic(_logic);
    }

    /**
     * @dev Registers an operator.
     * Calls before and after hooks if governance logic is set.
     * @param _operator Address of the operator.
     * @param _numOfShares Number of shares the operator is registering with.
     * @param _blsKey The operator's BLS key (uint256[4]).
     */
    function registerAsOperator(
        address _operator,
        uint256 _numOfShares,
        uint256[4] calldata _blsKey
    ) external {
        require(operatorShares[_operator] == 0, "Operator already registered");
        if (address(avsGovernanceLogic) != address(0)) {
            avsGovernanceLogic.beforeOperatorRegistered(_operator, _numOfShares, _blsKey);
        }
        operatorShares[_operator] = _numOfShares;
        emit OperatorRegistered(_operator, _numOfShares);
        if (address(avsGovernanceLogic) != address(0)) {
            avsGovernanceLogic.afterOperatorRegistered(_operator, _numOfShares, _blsKey);
        }
    }

    /**
     * @dev Unregisters an operator.
     * Calls before and after hooks if governance logic is set.
     * @param _operator Address of the operator to unregister.
     */
    function unregisterOperator(address _operator) external {
        require(operatorShares[_operator] > 0, "Operator not registered");
        if (address(avsGovernanceLogic) != address(0)) {
            avsGovernanceLogic.beforeOperatorUnregistered(_operator);
        }
        delete operatorShares[_operator];
        emit OperatorUnregistered(_operator);
        if (address(avsGovernanceLogic) != address(0)) {
            avsGovernanceLogic.afterOperatorUnregistered(_operator);
        }
    }

    // Additional governance functions can be added below:
    // - setNumOfOperatorsLimit
    // - setSlashingRate
    // - depositRewardsWithApprove
    // - setAvsName
    // - setAvsGovernanceMultisig
    // - setSupportedStrategies
    // - setMinVotingPower
    // - setMaxEffectiveBalance
    // - setMinSharesForStrategy
}
