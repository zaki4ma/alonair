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

      // ── 1. Insert pre_install block before the target block ──────────────
      // Build RNFB pods as static libraries instead of static frameworks so
      // they have no module map and RCTBridgeModule cannot be re-declared
      // inside an RNFBApp module (which causes the "must be imported from
      // module 'RNFBApp.RNFBAppModule'" Xcode build error).
      let targetIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^target\s+['"]/.test(lines[i])) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex === -1) {
        throw new Error(
          "[withFirebaseModularHeaders] Could not find target block in Podfile"
        );
      }

      const preInstallLines = [
        tag,
        "pre_install do |installer|",
        "  installer.pod_targets.each do |pod|",
        "    if pod.name.start_with?('RNFB')",
        "      def pod.build_type",
        "        Pod::BuildType.static_library",
        "      end",
        "    end",
        "  end",
        "end",
        "",
      ];
      lines.splice(targetIndex, 0, ...preInstallLines);

      // ── 2. Insert CLANG setting inside post_install block ─────────────────
      // Belt-and-suspenders: also suppress non-modular-include warnings for
      // any remaining framework targets that import React-Core headers.
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

      // Find the post_install's closing 'end' by matching indentation.
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

      const innerIndent = postInstallIndent + "  ";
      const postInstallInsert = [
        "",
        innerIndent + "installer.pods_project.targets.each do |target|",
        innerIndent + "  target.build_configurations.each do |build_config|",
        innerIndent + "    build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'",
        innerIndent + "  end",
        innerIndent + "end",
      ];
      lines.splice(endIndex, 0, ...postInstallInsert);

      fs.writeFileSync(podfilePath, lines.join("\n"), "utf-8");
      return modConfig;
    },
  ]);
}

module.exports = withFirebaseModularHeaders;
