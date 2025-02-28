import React, { useState, useEffect } from 'react';
import './ValidatorStatus.css';

const ValidatorStatus = ({ contractAddress }) => {
  const [validators, setValidators] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch validator metrics from the backend
  useEffect(() => {
    const fetchValidatorData = async () => {
      try {
        setLoading(true);
        
        // Fetch validator metrics
        const metricsResponse = await fetch('/api/validators/metrics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
          }
        });
        
        if (!metricsResponse.ok) {
          throw new Error(`Failed to fetch validator metrics: ${metricsResponse.statusText}`);
        }
        
        const metricsData = await metricsResponse.json();
        setValidators(metricsData.metrics || []);
        
        // Fetch notifications
        const notificationsResponse = await fetch('/api/validators/notifications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!notificationsResponse.ok) {
          throw new Error(`Failed to fetch notifications: ${notificationsResponse.statusText}`);
        }
        
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.notifications || []);
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchValidatorData();
    
    // Refresh data every 30 seconds
    const intervalId = setInterval(fetchValidatorData, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Simulate validator action (for testing)
  const simulateValidatorAction = async (address, success, actionType) => {
    try {
      const response = await fetch('/api/validators/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          validatorAddress: address,
          success,
          actionType
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to simulate action: ${response.statusText}`);
      }
      
      // Refresh data after simulation
      setTimeout(() => {
        // Fetch validator metrics again
        fetch('/api/validators/metrics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
          .then(res => res.json())
          .then(data => setValidators(data.metrics || []))
          .catch(err => console.error('Error refreshing metrics:', err));
          
        // Fetch notifications again
        fetch('/api/validators/notifications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
          .then(res => res.json())
          .then(data => setNotifications(data.notifications || []))
          .catch(err => console.error('Error refreshing notifications:', err));
      }, 1000);
    } catch (err) {
      console.error('Error simulating action:', err);
    }
  };
  
  // Helper function to format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  // Helper function to shorten addresses
  const shortenAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  if (loading) {
    return <div className="validator-loading">Loading validator data...</div>;
  }
  
  if (error) {
    return <div className="validator-error">Error: {error}</div>;
  }
  
  return (
    <div className="validator-status-container">
      <div className="contract-address">
        <h3>Deployed Contract Address</h3>
        <div className="address-display">
          {contractAddress}
          <button 
            className="copy-button"
            onClick={() => {
              navigator.clipboard.writeText(contractAddress);
              alert('Contract address copied to clipboard!');
            }}
          >
            Copy
          </button>
        </div>
      </div>
      
      <div className="validators-section">
        <h3>Validator Performance</h3>
        {validators.length === 0 ? (
          <p>No validator data available yet.</p>
        ) : (
          <table className="validators-table">
            <thead>
              <tr>
                <th>Validator</th>
                <th>Success Rate</th>
                <th>Total Actions</th>
                <th>Penalty Points</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {validators.map((validator) => (
                <tr key={validator.address}>
                  <td>{shortenAddress(validator.address)}</td>
                  <td>{validator.successRate.toFixed(2)}%</td>
                  <td>{validator.totalActions}</td>
                  <td>{validator.penaltyPoints}</td>
                  <td>
                    <span className={`status-badge ${validator.penaltyPoints >= 5 ? 'status-danger' : 'status-good'}`}>
                      {validator.penaltyPoints >= 5 ? '⚠️ At risk' : '✅ Good standing'}
                    </span>
                  </td>
                  <td className="action-buttons">
                    <button 
                      className="success-action"
                      onClick={() => simulateValidatorAction(validator.address, true, 'validation')}
                    >
                      Simulate Success
                    </button>
                    <button 
                      className="failure-action"
                      onClick={() => simulateValidatorAction(validator.address, false, 'validation')}
                    >
                      Simulate Failure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="notifications-section">
        <h3>Recent Notifications</h3>
        {notifications.length === 0 ? (
          <p>No notifications yet.</p>
        ) : (
          <div className="notification-list">
            {notifications.map((notification, index) => (
              <div 
                key={index} 
                className={`notification-item ${notification.type.includes('penalty') ? 'notification-warning' : ''}`}
              >
                <div className="notification-time">{formatTime(notification.timestamp)}</div>
                <div className="notification-message">{notification.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="telegram-integration">
        <h3>Telegram Notifications</h3>
        <p>
          Receive alerts and notifications via Telegram when validator actions occur or when the system requires attention.
        </p>
        <div className="telegram-setup">
          <input 
            type="text"
            className="telegram-input"
            placeholder="Enter your Telegram Bot Token"
          />
          <input 
            type="text"
            className="telegram-input"
            placeholder="Enter your Telegram Chat ID"
          />
          <button className="telegram-button">Connect Telegram</button>
        </div>
        
        <div className="test-notification">
          <h4>Send Test Notification</h4>
          <div className="test-notification-controls">
            <select className="priority-select">
              <option value="normal">Normal Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <input 
              type="text"
              className="message-input"
              placeholder="Enter test notification message"
            />
            <button 
              className="send-button"
              onClick={() => {
                const message = document.querySelector('.message-input').value;
                const priority = document.querySelector('.priority-select').value;
                
                if (!message) {
                  alert('Please enter a message for the notification');
                  return;
                }
                
                fetch('/api/notifications/test', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify({ message, priority })
                })
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      alert('Test notification sent successfully!');
                    } else {
                      alert('Failed to send test notification. Check console for details.');
                    }
                  })
                  .catch(err => {
                    console.error('Error sending test notification:', err);
                    alert('Error sending test notification: ' + err.message);
                  });
              }}
            >
              Send Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidatorStatus;