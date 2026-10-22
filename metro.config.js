const http = require('http');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web runs on a WebAssembly build that needs `.wasm` assets
// and SharedArrayBuffer, which browsers only expose to cross-origin isolated
// pages. Without these, opening the local DB never resolves and every
// local-first screen (dashboard, clients, orders, ...) spins forever.
config.resolver.assetExts.push('wasm');

// Expo CLI serves index.html from its own middleware ahead of Metro's, so
// `server.enhanceMiddleware` never sees that response. Stamp the isolation
// headers on every dev-server response instead (implicit headers from
// res.end() also go through writeHead).
const originalWriteHead = http.ServerResponse.prototype.writeHead;
http.ServerResponse.prototype.writeHead = function writeHead(...args) {
  if (!this.headersSent) {
    this.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    this.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  }
  return originalWriteHead.apply(this, args);
};

module.exports = withNativeWind(config, { input: './global.css' });
