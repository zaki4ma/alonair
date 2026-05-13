const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withGoogleServicesFile(config) {
  return withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const plistB64 = process.env.GOOGLE_SERVICE_INFO_PLIST;
      if (!plistB64) {
        return modConfig;
      }
      const filePath = path.join(
        modConfig.modRequest.projectRoot,
        "GoogleService-Info.plist"
      );
      fs.writeFileSync(filePath, Buffer.from(plistB64, "base64").toString("utf-8"));
      return modConfig;
    },
  ]);
}

module.exports = withGoogleServicesFile;
