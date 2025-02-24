const fs = require('fs');
const path = require('path');

const auditLogPath = path.join(__dirname, '../logs/audit.log');

function audit(event) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event
  };
  fs.appendFile(auditLogPath, JSON.stringify(logEntry) + "\n", err => {
    if (err) console.error("Failed to write audit log:", err);
  });
}

module.exports = {
  audit
};

