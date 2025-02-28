import React, { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import "./styles.css"
import WhitelistingPanel from "../../components/WhitelistingPanel"
import OperatorRegistrationPanel from "../../components/OperatorRegistrationPanel"

function DeployPage() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [operatorAllowlistAddress, setOperatorAllowlistAddress] = useState('');
  
  // Handler for account changes
  const handleAccountsChanged = useCallback((accounts) => {
    if (accounts.length === 0) {
      // User disconnected
      setAccount(null);
      setSigner(null);
      setIsConnected(false);
    } else {
      // Account changed
      setAccount(accounts[0]);
      if (provider) {
        setSigner(provider.getSigner(accounts[0]));
      }
      setIsConnected(true);
    }
  }, [provider]);
  
  // Initialize provider on page load
  useEffect(() => {
    // Check if window.ethereum is available
    if (window.ethereum) {
      const ethereumProvider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(ethereumProvider);
      
      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
      
      // Check if already connected
      ethereumProvider.listAccounts().then(accounts => {
        if (accounts.length > 0) {
          const account = accounts[0];
          setAccount(account);
          setSigner(ethereumProvider.getSigner(account));
          setIsConnected(true);
          
          // Get network
          ethereumProvider.getNetwork().then(network => {
            setNetwork(network);
          });
        }
      });
    }
    
    // Cleanup listeners on unmount
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [handleAccountsChanged]);
  
  // Connect wallet function
  const connectWallet = async () => {
    if (!provider) {
      alert('Please install MetaMask or another Web3 provider!');
      return;
    }
    
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      setAccount(account);
      setSigner(provider.getSigner(account));
      setIsConnected(true);
      
      // Get network
      const network = await provider.getNetwork();
      setNetwork(network);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };
  
  // Disconnect wallet (for UI purposes)
  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setIsConnected(false);
  };
  
  // Update contract address
  const handleContractAddressChange = (e) => {
    setOperatorAllowlistAddress(e.target.value);
  };

  return (
    <div className="deploy-page-container">
      <header className="deploy-header">
        <h1>Deploy and Register Operators</h1>
        
        <div className="wallet-connect">
          {isConnected ? (
            <div className="wallet-info">
              <span className="account">
                {account.substring(0, 6)}...{account.substring(account.length - 4)}
              </span>
              <span className="network">
                {network?.name}
              </span>
              <button onClick={disconnectWallet} className="disconnect-button">
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={connectWallet} className="connect-button">
              Connect Wallet
            </button>
          )}
        </div>
      </header>
      
      <main className="deploy-content">
        <div className="contract-address-input">
          <label htmlFor="contract-address">Operator Allowlist Contract Address:</label>
          <input
            id="contract-address"
            type="text"
            value={operatorAllowlistAddress}
            onChange={handleContractAddressChange}
            placeholder="0x..."
          />
        </div>
        
        {operatorAllowlistAddress && (
          <div className="panels-container">
            <div className="panel">
              <WhitelistingPanel 
                contractAddress={operatorAllowlistAddress}
                provider={provider}
                signer={signer}
              />
            </div>
            
            <div className="panel">
              <OperatorRegistrationPanel
                contractAddress={operatorAllowlistAddress}
                provider={provider}
                signer={signer}
                account={account}
              />
            </div>
          </div>
        )}
        
        {!operatorAllowlistAddress && (
          <div className="instructions">
            <p>Enter the Operator Allowlist contract address to continue.</p>
            <p>This address is used for whitelisting and registering operators.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default DeployPage;