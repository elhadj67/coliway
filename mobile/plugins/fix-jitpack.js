const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function fixJitpack(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes("url 'https://www.jitpack.io'")) {
      config.modResults.contents = config.modResults.contents.replace(
        "maven { url 'https://www.jitpack.io' }",
        `maven {
            url 'https://www.jitpack.io'
            content {
                includeGroupByRegex "com\\\\.github\\\\..*"
            }
        }`
      );
    }
    return config;
  });
};
