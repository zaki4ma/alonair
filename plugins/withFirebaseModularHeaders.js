const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const podfilePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfile = fs.readFileSync(podfilePath, "utf-8");

      const tag = "# firebase-modular-headers";
      if (podfile.includes(tag)) {
        return modConfig;
      }

      const insertLines = [
        "  " + tag,
        "  installer.pods_project.targets.each do |target|",
        "    target.build_configurations.each do |build_config|",
        "      build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'",
        "    end",
        "  end",
      ];

      // 最後の 'end' の直前に挿入（post_install ブロックの閉じ end）
      const lines = podfile.split("\n");
      let lastEndIndex = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim() === "end") {
          lastEndIndex = i;
          break;
        }
      }

      if (lastEndIndex === -1) {
        throw new Error(
          "[withFirebaseModularHeaders] Could not find closing end in Podfile"
        );
      }

      lines.splice(lastEndIndex, 0, "", ...insertLines);
      fs.writeFileSync(podfilePath, lines.join("\n"), "utf-8");
      return modConfig;
    },
  ]);
}

module.exports = withFirebaseModularHeaders;
