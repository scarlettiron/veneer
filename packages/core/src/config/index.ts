//Note: loadConfig is intentionally not exported here.
//It uses Node's file system, so it lives in its own entry, "@veneer/core/loader",
//to keep this main entry safe to import in the browser.
export { defineConfig } from './define-config.js';
export { resolveConfig } from './resolve-config.js';
