const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load private key for signing JWT tokens
const privateKey = fs.readFileSync(path.join(__dirname, '../config/private.pem'), 'utf8');

function generateToken(user) {
  // Define token payload and expiration
  const payload = {
    id: user.id,
    role: user.role,
    username: user.username
  };
  const options = {
    expiresIn: '1h',
    algorithm: 'RS256'
  };
  return jwt.sign(payload, privateKey, options);
}

module.exports = {
  generateToken
};
