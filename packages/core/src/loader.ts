//The config loader reads files from disk, so it uses Node's file system.
//It is kept in this separate entry, imported as "@veneer/core/loader", so that
//browser bundles that import the main "@veneer/core" entry never pull in Node
//only modules like fs.
export { loadConfig } from './config/load-config.js';
export type { LoadConfigOptions } from './config/load-config.js';
