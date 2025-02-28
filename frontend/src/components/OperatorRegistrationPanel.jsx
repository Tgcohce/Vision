import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  getOperatorAllowlistContract, 
  isOperatorWhitelisted, 
  registerOperator,
  withdrawOperatorDeposit,
  getOperatorStatus
} from '../utils/ContractUtils';

const OperatorRegistrationPanel = ({ contractAddress, provider, signer, account }) => {
  const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [requiredDepositAmount, setRequiredDepositAmount] = useState('0');
  const [operatorStatus, setOperatorStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const contract = signer ? getOperatorAllowlistContract(contractAddress, signer) : null;
  const readOnlyContract = provider ? getOperatorAllowlistContract(contractAddress, provider) : null;

  // Initialize with the connected account
  useEffect(() => {
    if (account) {
      setBeneficiaryAddress(account);
    }
  }, [account]);

  // Check operator status when account changes
  useEffect(() => {
    if (account && readOnlyContract) {
      fetchOperatorStatus();
    }
  }, [account, readOnlyContract, fetchOperatorStatus]);

  // Fetch the operator status
  const fetchOperatorStatus = useCallback(async () => {
    if (!account || !readOnlyContract) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get full operator status
      const status = await getOperatorStatus(readOnlyContract, account);
      setOperatorStatus(status);
      
      // Try to get the required deposit amount from the contract
      try {
        const depositRequirement = await readOnlyContract.requiredDepositAmount();
        setRequiredDepositAmount(ethers.utils.formatEther(depositRequirement));
        
        // If we get here, set a default deposit amount as a suggestion
        if (!depositAmount) {
          setDepositAmount(ethers.utils.formatEther(depositRequirement));
        }
      } catch (e) {
        console.warn("Could not get requiredDepositAmount from contract:", e);
      }
    } catch (err) {
      console.error("Error fetching operator status:", err);
      setError(`Error fetching operator status: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [account, readOnlyContract, depositAmount]);

  // Check if the address is valid
  const isValidAddress = (address) => {
    return ethers.utils.isAddress(address);
  };

  // Check if deposit amount is valid
  const isValidDepositAmount = () => {
    try {
      const amountWei = ethers.utils.parseEther(depositAmount);
      return amountWei.gt(0);
    } catch (err) {
      return false;
    }
  };

  // Handle registration
  const handleRegister = async () => {
    if (!contract || !isValidAddress(beneficiaryAddress) || !isValidDepositAmount()) {
      setError('Invalid inputs or not connected');
      return;
    }
    
    try {
      setIsRegistering(true);
      setError(null);
      setSuccessMessage('');
      
      // First check if operator is whitelisted
      const whitelisted = await isOperatorWhitelisted(contract, account);
      if (!whitelisted) {
        setError('Your address is not whitelisted. Please contact the admin.');
        setIsRegistering(false);
        return;
      }
      
      // Convert ETH to wei
      const depositWei = ethers.utils.parseEther(depositAmount);
      
      // Register as operator
      const tx = await registerOperator(contract, beneficiaryAddress, depositWei);
      await tx.wait();
      
      setSuccessMessage(`Successfully registered as operator with ${depositAmount} ETH`);
      
      // Refresh status
      await fetchOperatorStatus();
    } catch (err) {
      console.error("Error registering as operator:", err);
      setError(`Error registering as operator: ${err.message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle withdrawal
  const handleWithdraw = async () => {
    if (!contract || !operatorStatus || !operatorStatus.isRegistered || operatorStatus.hasWithdrawn) {
      setError('Cannot withdraw: not registered or already withdrawn');
      return;
    }
    
    try {
      setIsWithdrawing(true);
      setError(null);
      setSuccessMessage('');
      
      // Withdraw deposit
      const tx = await withdrawOperatorDeposit(contract);
      await tx.wait();
      
      setSuccessMessage(`Successfully withdrew ${operatorStatus.depositAmount} ETH to ${operatorStatus.beneficiary}`);
      
      // Refresh status
      await fetchOperatorStatus();
    } catch (err) {
      console.error("Error withdrawing deposit:", err);
      setError(`Error withdrawing deposit: ${err.message}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Render the registration form
  return (
    <div className="registration-panel">
      <h2>Operator Registration</h2>
      
      {isLoading ? (
        <p className="loading">Loading operator status...</p>
      ) : operatorStatus ? (
        <div className="operator-status">
          <h3>Your Operator Status</h3>
          <p>Address: {operatorStatus.address}</p>
          <p>Whitelisted: {operatorStatus.isWhitelisted ? '✓ Yes' : '✗ No'}</p>
          <p>Registered: {operatorStatus.isRegistered ? '✓ Yes' : '✗ No'}</p>
          
          {operatorStatus.isRegistered && (
            <>
              <p>Beneficiary: {operatorStatus.beneficiary}</p>
              <p>Deposit Amount: {operatorStatus.depositAmount} ETH</p>
              <p>Has Withdrawn: {operatorStatus.hasWithdrawn ? '✓ Yes' : '✗ No'}</p>
            </>
          )}
        </div>
      ) : (
        <p>Connect your wallet to see operator status</p>
      )}
      
      {!operatorStatus?.isRegistered && (
        <div className="registration-form">
          <h3>Register as Operator</h3>
          <p className="note">Required deposit: {requiredDepositAmount} ETH</p>
          
          <div className="input-group">
            <label htmlFor="beneficiary-address">Beneficiary Address:</label>
            <input
              id="beneficiary-address"
              type="text"
              value={beneficiaryAddress}
              onChange={(e) => setBeneficiaryAddress(e.target.value)}
              placeholder="0x..."
              className={!beneficiaryAddress || isValidAddress(beneficiaryAddress) ? '' : 'invalid'}
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="deposit-amount">Deposit Amount (ETH):</label>
            <input
              id="deposit-amount"
              type="text"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="1.0"
              className={isValidDepositAmount() ? '' : 'invalid'}
            />
          </div>
          
          <button
            onClick={handleRegister}
            disabled={
              !contract || 
              !account || 
              !isValidAddress(beneficiaryAddress) || 
              !isValidDepositAmount() || 
              isRegistering || 
              operatorStatus?.isRegistered || 
              !operatorStatus?.isWhitelisted
            }
            className="register-button"
          >
            {isRegistering ? 'Registering...' : 'Register'}
          </button>
          
          {!operatorStatus?.isWhitelisted && (
            <p className="warning">You must be whitelisted to register as an operator.</p>
          )}
        </div>
      )}
      
      {operatorStatus?.isRegistered && !operatorStatus?.hasWithdrawn && (
        <div className="withdrawal-section">
          <h3>Withdraw Deposit</h3>
          <p className="note">
            You can withdraw your deposit of {operatorStatus.depositAmount} ETH.
            Funds will be sent to your beneficiary address: {operatorStatus.beneficiary}
          </p>
          
          <button
            onClick={handleWithdraw}
            disabled={isWithdrawing || !contract}
            className="withdraw-button"
          >
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw Deposit'}
          </button>
        </div>
      )}
      
      {error && <p className="error">{error}</p>}
      {successMessage && <p className="success">{successMessage}</p>}
    </div>
  );
};

export default OperatorRegistrationPanel;