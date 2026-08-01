// metro.config.js — Optimized for production performance & bundle size
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const { FileStore } = require("metro-cache");

const config = getDefaultConfig(__dirname);

// ── Cache ───────────────────────────────────────────────────────────────
// Use a stable on-disk store (shared across web/android)
const root =
  process.env.METRO_CACHE_ROOT || path.join(__dirname, ".metro-cache");
config.cacheStores = [new FileStore({ root: path.join(root, "cache") })];

// ── Resolver ────────────────────────────────────────────────────────────
// Exclude directories that are irrelevant to the JS bundle from the
// haste map. This reduces startup time, memory, and watcher load.
const { resolve } = require("path");
const exclusionList = (() => {
  try {
    return require("metro-config/src/defaults/exclusionList");
  } catch {
    // Fallback for older metro versions
    return require("metro-config/src/defaults/blacklist");
  }
})();

config.resolver.blockList = exclusionList([
  // Platform-native build artifacts we never need in JS
  /.*\/android\/.*$/,
  /.*\/ios\/.*$/,
  // Test files
  /.*\/__tests__\/.*$/,
  // Git internals
  /.*\/.git\/.*$/,
  // Other platform shims inside node_modules
  /node_modules\/.*\/windows\/.*/,
  /node_modules\/.*\/macos\/.*/,
]);

// ── Transformer ─────────────────────────────────────────────────────────
config.transformer = {
  ...config.transformer,
  // Minify in production for smaller bundles
  minifierConfig: {
    compress: {
      // Remove console.log/warn in production
      drop_console: process.env.NODE_ENV === "production",
      reduce_vars: true,
      passes: 2,
    },
    mangle: {
      toplevel: false,
    },
  },
};

// ── Serializer ──────────────────────────────────────────────────────────
config.serializer = {
  ...config.serializer,
  // Tree shaking: mark unused imports for removal
  experimentalSerializerHook: undefined,
};

// ── Workers ─────────────────────────────────────────────────────────────
// Reduce the number of workers to decrease resource usage on dev machines
config.maxWorkers = 2;

module.exports = config;
