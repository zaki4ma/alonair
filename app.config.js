const appJson = require('./app.json');
const expo = { ...appJson.expo };

// In EAS builds, GOOGLE_SERVICE_INFO_PLIST is the path to the file secret
if (process.env.GOOGLE_SERVICE_INFO_PLIST) {
  expo.ios = {
    ...expo.ios,
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST,
  };
}

module.exports = { ...appJson, expo };
