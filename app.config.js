const fs = require('fs');
const path = require('path');

const plistPath = path.join(__dirname, 'GoogleService-Info.plist');
const plistB64 = process.env.GOOGLE_SERVICE_INFO_PLIST;
if (plistB64 && !fs.existsSync(plistPath)) {
  fs.writeFileSync(plistPath, Buffer.from(plistB64, 'base64').toString('utf-8'));
}

module.exports = require('./app.json');
