'use strict';

const axios = require('axios');
const { logger } = require('../monitoring/logger');
const fs = require('fs');
const path = require('path');

// Store notification history for dashboard display
const notificationHistory = [];
const MAX_HISTORY = 100;

// Load config for notification services
let telegramConfig = {
  enabled: false,
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || ''
};

// Track validator performance for penalties
const validatorPerformance = new Map();

/**
 * Send a notification to Telegram
 * @param {string} message - The message to send
 * @param {Object} options - Additional options like priority
 * @returns {Promise<boolean>} - Success status
 */
async function sendTelegramNotification(message, options = {}) {
  if (!telegramConfig.enabled || !telegramConfig.botToken || !telegramConfig.chatId) {
    logger.warn('Telegram notifications not configured');
    return false;
  }

  try {
    const priority = options.priority || 'normal';
    let formattedMessage = message;
    
    // Format message based on priority
    if (priority === 'high') {
      formattedMessage = `🚨 URGENT: ${message}`;
    } else if (priority === 'medium') {
      formattedMessage = `⚠️ IMPORTANT: ${message}`;
    } else {
      formattedMessage = `ℹ️ ${message}`;
    }
    
    const url = `https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: telegramConfig.chatId,
      text: formattedMessage,
      parse_mode: 'Markdown'
    });
    
    logger.info(`Telegram notification sent: ${message}`);
    return response.data && response.data.ok;
  } catch (error) {
    logger.error(`Error sending Telegram notification: ${error.message}`);
    return false;
  }
}

/**
 * Record validator action (success or failure)
 * @param {string} validatorAddress - Validator's address
 * @param {boolean} success - Whether the action was successful
 * @param {string} actionType - Type of action (validation, attestation, etc.)
 */
function recordValidatorAction(validatorAddress, success, actionType) {
  if (!validatorAddress) return;
  
  // Initialize if not exists
  if (!validatorPerformance.has(validatorAddress)) {
    validatorPerformance.set(validatorAddress, {
      address: validatorAddress,
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      successRate: 0,
      penaltyPoints: 0,
      actionHistory: []
    });
  }
  
  const validatorData = validatorPerformance.get(validatorAddress);
  validatorData.totalActions++;
  
  if (success) {
    validatorData.successfulActions++;
  } else {
    validatorData.failedActions++;
    // Add penalty points for failures
    validatorData.penaltyPoints += 1;
  }
  
  // Calculate success rate
  validatorData.successRate = (validatorData.successfulActions / validatorData.totalActions) * 100;
  
  // Record action in history
  validatorData.actionHistory.push({
    timestamp: Date.now(),
    actionType,
    success,
    penaltyPointsEarned: success ? 0 : 1
  });
  
  // Keep history limited to last 100 actions
  if (validatorData.actionHistory.length > 100) {
    validatorData.actionHistory.shift();
  }
  
  // Notify if validator performance is poor
  if (validatorData.penaltyPoints >= 5) {
    sendValidatorPenaltyNotification(validatorAddress, validatorData.penaltyPoints);
  }
  
  // Update the map
  validatorPerformance.set(validatorAddress, validatorData);
  
  // Log the action
  logger.info(`Validator ${validatorAddress} ${actionType} ${success ? 'succeeded' : 'failed'}. Total penalty points: ${validatorData.penaltyPoints}`);
}

/**
 * Send notification when validator accrues penalties
 * @param {string} validatorAddress - The validator's address
 * @param {number} penaltyPoints - Current penalty points
 */
async function sendValidatorPenaltyNotification(validatorAddress, penaltyPoints) {
  const shortAddress = `${validatorAddress.substring(0, 6)}...${validatorAddress.substring(validatorAddress.length - 4)}`;
  const message = `Validator ${shortAddress} has accrued ${penaltyPoints} penalty points and may be subject to slashing.`;
  
  // Notify via Telegram
  await sendTelegramNotification(message, { priority: 'high' });
  
  // Add to notification history
  addNotification({
    type: 'validator_penalty',
    message,
    timestamp: Date.now(),
    address: validatorAddress,
    penaltyPoints
  });
}

/**
 * Add notification to history
 * @param {Object} notification - The notification object
 */
function addNotification(notification) {
  notificationHistory.unshift(notification);
  
  // Limit history size
  if (notificationHistory.length > MAX_HISTORY) {
    notificationHistory.pop();
  }
}

/**
 * Get notification history
 * @param {number} limit - Maximum number of notifications to return
 * @returns {Array} - Notification history
 */
function getNotificationHistory(limit = MAX_HISTORY) {
  return notificationHistory.slice(0, limit);
}

/**
 * Get validator performance data
 * @param {string} validatorAddress - Optional validator address to filter by
 * @returns {Array|Object} - Validator performance data
 */
function getValidatorPerformance(validatorAddress) {
  if (validatorAddress) {
    return validatorPerformance.get(validatorAddress) || null;
  }
  
  // Return all validators as an array
  return Array.from(validatorPerformance.values());
}

/**
 * Handle blockchain events and trigger notifications
 * @param {Object} event - The blockchain event object
 * @param {string} eventType - Type of event (TaskValidated, etc.)
 */
function handleBlockchainEvent(event, eventType) {
  try {
    // Extract event data
    const returnValues = event.returnValues;
    let validatorAddress, success, message;
    
    // Process different event types
    if (eventType === 'TaskValidated') {
      validatorAddress = returnValues.validator;
      success = returnValues.result;
      message = `Validator ${validatorAddress.substring(0, 6)}...${validatorAddress.substring(validatorAddress.length - 4)} ${success ? 'successfully' : 'failed to'} validate a task`;
      
      // Record validator action
      recordValidatorAction(validatorAddress, success, 'validation');
    } else if (eventType === 'TaskAttested') {
      validatorAddress = returnValues.validator;
      success = returnValues.success;
      message = `Validator ${validatorAddress.substring(0, 6)}...${validatorAddress.substring(validatorAddress.length - 4)} ${success ? 'successfully' : 'failed to'} attest a task`;
      
      // Record validator action
      recordValidatorAction(validatorAddress, success, 'attestation');
    } else if (eventType === 'StakeDeposited') {
      validatorAddress = returnValues.validator;
      const amount = web3.utils.fromWei(returnValues.amount, 'ether');
      message = `Validator ${validatorAddress.substring(0, 6)}...${validatorAddress.substring(validatorAddress.length - 4)} deposited ${amount} ETH as stake`;
    } else if (eventType === 'StakeWithdrawn') {
      validatorAddress = returnValues.validator;
      const amount = web3.utils.fromWei(returnValues.amount, 'ether');
      message = `Validator ${validatorAddress.substring(0, 6)}...${validatorAddress.substring(validatorAddress.length - 4)} withdrew ${amount} ETH from stake`;
    }
    
    // Send notification
    if (message) {
      sendTelegramNotification(message);
      
      // Add to notification history
      addNotification({
        type: eventType.toLowerCase(),
        message,
        timestamp: Date.now(),
        address: validatorAddress,
        success
      });
    }
  } catch (error) {
    logger.error(`Error handling blockchain event: ${error.message}`);
  }
}

/**
 * Configure notification services
 * @param {Object} config - Configuration object
 */
function configureNotificationServices(config) {
  if (config.telegram) {
    telegramConfig = {
      ...telegramConfig,
      ...config.telegram
    };
    
    // Enable Telegram if we have required fields
    telegramConfig.enabled = !!(telegramConfig.botToken && telegramConfig.chatId);
    
    if (telegramConfig.enabled) {
      logger.info('Telegram notifications enabled');
    }
  }
}

// Load configuration
try {
  const configPath = path.join(process.cwd(), 'src', 'config', 'notifications.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    configureNotificationServices(config);
  }
} catch (error) {
  logger.warn(`Failed to load notification configuration: ${error.message}`);
}

module.exports = {
  sendTelegramNotification,
  recordValidatorAction,
  getValidatorPerformance,
  getNotificationHistory,
  handleBlockchainEvent
};