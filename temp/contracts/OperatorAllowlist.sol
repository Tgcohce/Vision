// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./IOperatorAllowlist.sol";

/**
 * @title OperatorAllowlist
 * @author Alt Research
 * @notice This contract manages the allowlist of operators for the Alt Research contract ecosystem.
 */
contract OperatorAllowlist is IOperatorAllowlist, Ownable {
    uint256 public requiredDepositAmount;

    mapping(address => bool) private whitelistedOperators;
    mapping(address => mapping(uint256 => TokenInfo)) private tokens;
    mapping(string => ProofInfo) private proofs;
    mapping(address => OperatorInfo) private operators;

    constructor(uint256 _requiredDepositAmount) {
        requiredDepositAmount = _requiredDepositAmount;
    }

    /** Modifiers */

    modifier onlyAllowed() {
        require(isAllowed(msg.sender), "OperatorAllowlist: operator not allowed");
        _;
    }

    modifier onlyRegistered() {
        require(isRegistered(msg.sender), "OperatorAllowlist: operator not registered");
        _;
    }

    /** Getters / view functions */

    function isWhitelisted(address operator) public view returns (bool) {
        return whitelistedOperators[operator];
    }

    function isAllowed(address operator) public view returns (bool) {
        return isWhitelisted(operator);
    }

    function isRegistered(address operator) public view returns (bool) {
        return operators[operator].isRegistered;
    }

    function getBeneficiary(address operator) public view returns (address) {
        return operators[operator].beneficiary;
    }

    function getDepositAmount(address operator) public view returns (uint256) {
        return operators[operator].depositAmount;
    }

    function hasWithdrawn(address operator) public view returns (bool) {
        return operators[operator].hasWithdrawn;
    }

    function getOperatorInfo(address operator) public view returns (OperatorInfo memory) {
        OperatorInfo memory info = operators[operator];
        info.isAllowed = isAllowed(operator);
        return info;
    }

    function getTokenInfo(
        address tokenContract,
        uint256 tokenId
    ) public view returns (TokenInfo memory) {
        return tokens[tokenContract][tokenId];
    }

    function isProofActive(string calldata proofId) public view returns (bool) {
        return proofs[proofId].isActive;
    }

    function getProofInfo(string calldata proofId) public view returns (ProofInfo memory) {
        return proofs[proofId];
    }

    /** Owner / admin functions */

    function whitelistOperator(address operator) external onlyOwner {
        whitelistedOperators[operator] = true;
        emit OperatorWhitelisted(operator);
    }

    function whitelistOperators(address[] calldata _operators) external onlyOwner {
        for (uint256 i = 0; i < _operators.length; i++) {
            whitelistedOperators[_operators[i]] = true;
            emit OperatorWhitelisted(_operators[i]);
        }
    }

    function unwhitelistOperator(address operator) external onlyOwner {
        whitelistedOperators[operator] = false;
        emit OperatorUnwhitelisted(operator);
    }

    function unwhitelistOperators(address[] calldata _operators) external onlyOwner {
        for (uint256 i = 0; i < _operators.length; i++) {
            whitelistedOperators[_operators[i]] = false;
            emit OperatorUnwhitelisted(_operators[i]);
        }
    }

    function registerToken(address tokenContract, uint256 tokenId, address owner) external onlyOwner {
        TokenInfo storage token = tokens[tokenContract][tokenId];
        require(!token.isReady, "OperatorAllowlist: token already registered");

        token.isReady = true;
        token.deployed = false;
        token.delegatable = false;
        token.tokenContract = tokenContract;
        token.tokenId = tokenId;
        token.owner = owner;

        emit TokenRegistered(tokenContract, tokenId, owner);
    }

    function updateToken(
        address tokenContract,
        uint256 tokenId,
        address owner,
        bool deployed,
        bool delegatable
    ) external onlyOwner {
        TokenInfo storage token = tokens[tokenContract][tokenId];
        require(token.isReady, "OperatorAllowlist: token not registered");

        token.deployed = deployed;
        token.delegatable = delegatable;
        token.owner = owner;

        emit TokenUpdated(tokenContract, tokenId, owner, deployed, delegatable);
    }

    function activateProof(string calldata proofId) external onlyOwner {
        ProofInfo storage proof = proofs[proofId];
        require(proof.submitter != address(0), "OperatorAllowlist: proof not submitted");
        proof.isActive = true;
        emit ProofActivated(proofId);
    }

    function deactivateProof(string calldata proofId) external onlyOwner {
        ProofInfo storage proof = proofs[proofId];
        require(proof.submitter != address(0), "OperatorAllowlist: proof not submitted");
        proof.isActive = false;
        emit ProofDeactivated(proofId);
    }

    function setRequiredDepositAmount(uint256 _requiredDepositAmount) external onlyOwner {
        requiredDepositAmount = _requiredDepositAmount;
    }

    /** Public functions */

    function register(address payable beneficiary) external payable onlyAllowed {
        require(beneficiary != address(0), "OperatorAllowlist: zero beneficiary address");
        require(!isRegistered(msg.sender), "OperatorAllowlist: already registered");
        require(
            msg.value >= requiredDepositAmount,
            "OperatorAllowlist: incorrect deposit amount"
        );

        OperatorInfo storage operator = operators[msg.sender];
        operator.isRegistered = true;
        operator.beneficiary = beneficiary;
        operator.depositAmount = msg.value;

        emit OperatorRegistered(msg.sender, msg.value, beneficiary);
    }

    function withdraw() external onlyRegistered {
        OperatorInfo storage operator = operators[msg.sender];
        require(!operator.hasWithdrawn, "OperatorAllowlist: already withdrawn");

        operator.hasWithdrawn = true;
        uint256 amount = operator.depositAmount;

        (bool success, ) = operator.beneficiary.call{value: amount}("");
        require(success, "OperatorAllowlist: transfer failed");

        emit OperatorWithdrawn(msg.sender, amount, operator.beneficiary);
    }

    function submitProof(string calldata proofId) external onlyRegistered {
        ProofInfo storage proof = proofs[proofId];
        require(proof.submitter == address(0), "OperatorAllowlist: proof already submitted");

        proof.submitter = msg.sender;
        proof.proofId = proofId;
        proof.timestamp = block.timestamp;

        emit ProofSubmitted(proofId, msg.sender);
    }
}