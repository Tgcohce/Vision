const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { logger } = require('../monitoring/logger');

// Development mode check
const isDevelopment = process.env.NODE_ENV !== 'production';

let publicKey;
try {
  // Load a public key for verifying JWT tokens
  publicKey = fs.readFileSync(path.join(__dirname, '../config/public.pem'), 'utf8');
  logger.info('JWT public key loaded successfully');
} catch (error) {
  logger.warn(`Could not load JWT public key: ${error.message}`);
  if (isDevelopment) {
    // In development, use a dummy key
    publicKey = 'dummy-development-key';
    logger.info('Using dummy JWT key for development');
  } else {
    // In production, this would be a critical error
    logger.error('CRITICAL: JWT public key required in production mode');
  }
}

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  // In development mode, we can bypass token validation
  if (isDevelopment) {
    logger.info('Development mode: Bypassing JWT authentication');
    // Set a mock user with admin role for development
    req.user = { 
      id: 'dev-user',
      role: 'admin',
      name: 'Development User'
    };
    return next();
  }

  // Production behavior - validate the token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer TOKEN"

  if (!token) return res.status(401).json({ message: 'Missing token' });

  jwt.verify(token, publicKey, (err, user) => {
    if (err) {
      logger.error("JWT verification error:", err);
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  authenticateToken
};