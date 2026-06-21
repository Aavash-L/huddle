module.exports = function (api) {
  // Use caller-based caching so the web/native split is respected
  const isWeb = api.caller((caller) => caller?.platform === 'web');

  return {
    presets: [
      // jsxImportSource handles NativeWind v4 — no separate nativewind/babel plugin needed
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      // react-native-reanimated/plugin is native-only; web builds don't need it
      ...(isWeb ? [] : ['react-native-reanimated/plugin']),
    ],
  };
};
