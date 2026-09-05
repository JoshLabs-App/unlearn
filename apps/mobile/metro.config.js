// Standalone Expo app (no monorepo workspace packages), so no watchFolders/
// nodeModulesPaths overrides are needed — just the default config.
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
