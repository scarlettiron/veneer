//Veneer
//Licensed under the MIT License. See the LICENSE file in the project root.
//Copyright (c) 2026 Scarlett A. Scott (codescarlett)
//
//Contributors:
//Scarlett A. Scott (codescarlett)

import type { VeneerUserConfig } from '../types/index.js';

//A small helper that gives full type checking and editor hints
//when the user writes their veneer.config file.
//It simply returns the config object it is given.
export const defineConfig = (config: VeneerUserConfig): VeneerUserConfig => config;
