const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: resolve packages from both the app dir and the workspace root
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Stub server-only packages that don't exist in the mobile/web bundle
config.resolver.extraNodeModules = {
  '@opentelemetry/api': path.resolve(__dirname, 'shims/empty.js'),
};

module.exports = config;
