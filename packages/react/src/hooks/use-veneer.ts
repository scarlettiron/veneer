//Veneer
//Licensed under the MIT License. See the LICENSE file in the project root.
//Copyright (c) 2026 Scarlett A. Scott (codescarlett)
//
//Contributors:
//Scarlett A. Scott (codescarlett)

import { useContext } from 'react';

import { VeneerContext, type VeneerContextValue } from '../context/veneer-context.js';

//Reads the Veneer context.
//Throws a clear error when used outside of the provider.
export const useVeneer = (): VeneerContextValue => {
  const context = useContext(VeneerContext);

  if (!context) {
    throw new Error('useVeneer must be used inside a VeneerProvider');
  }

  return context;
};
