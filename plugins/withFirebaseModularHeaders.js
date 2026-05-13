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
      const podfile = fs.readFileSync(podfilePath, "utf-8");

      const tag = "# firebase-modular-headers";
      if (podfile.includes(tag)) return modConfig;

      const lines = podfile.split("\n");

      // Find the post_install block
      let postInstallIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/\bpost_install\b.*\bdo\b/.test(lines[i])) {
          postInstallIndex = i;
          break;
        }
      }

      if (postInstallIndex === -1) {
        throw new Error(
          "[withFirebaseModularHeaders] Could not find post_install block in Podfile"
        );
      }

      // Find the matching 'end' by indentation level.
      // The closing 'end' of the post_install block has the same leading
      // whitespace as the 'post_install do' line itself.
      const postInstallIndent = lines[postInstallIndex].match(/^(\s*)/)[1];
      let endIndex = -1;
      for (let i = postInstallIndex + 1; i < lines.length; i++) {
        const lineIndent = lines[i].match(/^(\s*)/)[1];
        if (lineIndent === postInstallIndent && lines[i].trim() === "end") {
          endIndex = i;
          break;
        }
      }

      if (endIndex === -1) {
        throw new Error(
          "[withFirebaseModularHeaders] Could not find closing end of post_install block"
        );
      }

      // Insert one indentation level inside post_install, before its closing end
      const innerIndent = postInstallIndent + "  ";
      const insertLines = [
        "",
        innerIndent + tag,
        innerIndent + "installer.pods_project.targets.each do |target|",
        innerIndent + "  target.build_configurations.each do |build_config|",
        innerIndent + "    build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'",
        innerIndent + "  end",
        innerIndent + "end",
      ];

      lines.splice(endIndex, 0, ...insertLines);
      fs.writeFileSync(podfilePath, lines.join("\n"), "utf-8");
      return modConfig;
    },
  ]);
}

module.exports = withFirebaseModularHeaders;
