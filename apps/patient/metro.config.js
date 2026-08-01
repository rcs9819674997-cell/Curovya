// metro.config.js — Optimized for production performance & bundle size
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const { FileStore } = require("metro-cache");

const config = getDefaultConfig(__dirname);

// ── Cache ───────────────────────────────────────────────────────────────
const root =
  process.env.METRO_CACHE_ROOT || path.join(__dirname, ".metro-cache");
config.cacheStores = [new FileStore({ root: path.join(root, "cache") })];

// ── Resolver ────────────────────────────────────────────────────────────
// Exclude directories that are irrelevant to the JS bundle.
config.resolver.blockList = [
  /.*\/android\/.*$/,
  /.*\/ios\/.*$/,
  /.*\/__tests__\/.*$/,
  /.*\/.git\/.*$/,
  /node_modules\/.*\/windows\/.*/,
  /node_modules\/.*\/macos\/.*/,
];

// ── Transformer ─────────────────────────────────────────────────────────
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      drop_console: process.env.NODE_ENV === "production",
      reduce_vars: true,
      passes: 2,
    },
    mangle: {
      toplevel: false,
    },
  },
};

// ── Workers ─────────────────────────────────────────────────────────────
config.maxWorkers = 2;

module.exports = config;
