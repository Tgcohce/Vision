import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  getOperatorAllowlistContract, 
  whitelistOperator, 
  unwhitelistOperator, 
  getOperatorStatus 
} from '../utils/ContractUtils';

const WhitelistingPanel = ({ contractAddress, provider, signer }) => {
  const [operatorAddress, setOperatorAddress] = useState('');
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [operatorStatus, setOperatorStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const contract = signer ? getOperatorAllowlistContract(contractAddress, signer) : null;
  const readOnlyContract = provider ? getOperatorAllowlistContract(contractAddress, provider) : null;

  useEffect(() => {
    if (operatorAddress && ethers.utils.isAddress(operatorAddress) && readOnlyContract) {
      checkOperatorStatus(operatorAddress);
    } else {
      setIsWhitelisted(false);
      setOperatorStatus(null);
    }
  }, [operatorAddress, readOnlyContract, checkOperatorStatus]);

  // Check if the operator address is valid
  const isValidAddress = (address) => {
    return ethers.utils.isAddress(address);
  };

  // Check if an operator is whitelisted
  const checkOperatorStatus = useCallback(async (address) => {
    if (!readOnlyContract || !isValidAddress(address)) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the full operator status
      const status = await getOperatorStatus(readOnlyContract, address);
      setOperatorStatus(status);
      setIsWhitelisted(status.isWhitelisted);
    } catch (err) {
      console.error("Error checking operator status:", err);
      setError(`Error checking operator status: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [readOnlyContract]);

  // Handle whitelisting an operator
  const handleWhitelist = async () => {
    if (!contract || !isValidAddress(operatorAddress)) {
      setError('Invalid operator address or not connected');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage('');
      
      const tx = await whitelistOperator(contract, operatorAddress);
      await tx.wait();
      
      setIsWhitelisted(true);
      setSuccessMessage(`Successfully whitelisted operator ${operatorAddress}`);
      
      // Refresh operator status
      await checkOperatorStatus(operatorAddress);
    } catch (err) {
      console.error("Error whitelisting operator:", err);
      setError(`Error whitelisting operator: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle unwhitelisting an operator
  const handleUnwhitelist = async () => {
    if (!contract || !isValidAddress(operatorAddress)) {
      setError('Invalid operator address or not connected');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage('');
      
      const tx = await unwhitelistOperator(contract, operatorAddress);
      await tx.wait();
      
      setIsWhitelisted(false);
      setSuccessMessage(`Successfully unwhitelisted operator ${operatorAddress}`);
      
      // Refresh operator status
      await checkOperatorStatus(operatorAddress);
    } catch (err) {
      console.error("Error unwhitelisting operator:", err);
      setError(`Error unwhitelisting operator: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="whitelisting-panel">
      <h2>Operator Whitelisting</h2>
      
      <div className="input-group">
        <label htmlFor="operator-address">Operator Address:</label>
        <input
          id="operator-address"
          type="text"
          value={operatorAddress}
          onChange={(e) => setOperatorAddress(e.target.value)}
          placeholder="0x..."
          className={!operatorAddress || isValidAddress(operatorAddress) ? '' : 'invalid'}
        />
        <button 
          onClick={() => checkOperatorStatus(operatorAddress)}
          disabled={!readOnlyContract || !isValidAddress(operatorAddress) || isLoading}
        >
          Check Status
        </button>
      </div>
      
      {operatorStatus && (
        <div className="operator-status">
          <h3>Operator Status</h3>
          <p>Address: {operatorStatus.address}</p>
          <p>Whitelisted: {operatorStatus.isWhitelisted ? 'Yes' : 'No'}</p>
          <p>Registered: {operatorStatus.isRegistered ? 'Yes' : 'No'}</p>
          {operatorStatus.isRegistered && (
            <>
              <p>Beneficiary: {operatorStatus.beneficiary}</p>
              <p>Deposit Amount: {operatorStatus.depositAmount} ETH</p>
              <p>Has Withdrawn: {operatorStatus.hasWithdrawn ? 'Yes' : 'No'}</p>
            </>
          )}
        </div>
      )}
      
      <div className="actions">
        <button
          onClick={handleWhitelist}
          disabled={!contract || !isValidAddress(operatorAddress) || isWhitelisted || isLoading}
          className="whitelist-button"
        >
          Whitelist Operator
        </button>
        
        <button
          onClick={handleUnwhitelist}
          disabled={!contract || !isValidAddress(operatorAddress) || !isWhitelisted || isLoading}
          className="unwhitelist-button"
        >
          Unwhitelist Operator
        </button>
      </div>
      
      {isLoading && <p className="loading">Loading...</p>}
      {error && <p className="error">{error}</p>}
      {successMessage && <p className="success">{successMessage}</p>}
    </div>
  );
};

export default WhitelistingPanel;