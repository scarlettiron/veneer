//Veneer
//Licensed under the MIT License. See the LICENSE file in the project root.
//Copyright (c) 2026 Scarlett A. Scott (codescarlett)
//
//Contributors:
//Scarlett A. Scott (codescarlett)

//The Next package gives you the route handler for the backend
//and re-exports the React bindings so you can import everything from one place.

export { createVeneerRouteHandler, createVeneerPagesApiRoute } from './route-handler.js';
export type { VeneerRouteHandlers } from './route-handler.js';

//Re-export the config helpers so you can keep all imports in one place.
export { defineConfig, resolveConfig } from '@veneer/core';
export type { VeneerConfig, VeneerUserConfig } from '@veneer/core';

//Re-export the server factory for hosts that want direct access.
export { createVeneerServer, createVeneerServerFromConfig } from '@veneer/server';
export type { VeneerServer } from '@veneer/server';

//Re-export all of the React bindings.
export * from '@veneer/react';
