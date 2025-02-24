const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load a public key for verifying JWT tokens
const publicKey = fs.readFileSync(path.join(__dirname, '../config/public.pem'), 'utf8');

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer TOKEN"

  if (!token) return res.status(401).json({ message: 'Missing token' });

  jwt.verify(token, publicKey, (err, user) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  authenticateToken
};
