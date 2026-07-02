//Veneer
//Licensed under the MIT License. See the LICENSE file in the project root.
//Copyright (c) 2026 Scarlett A. Scott (codescarlett)
//
//Contributors:
//Scarlett A. Scott (codescarlett)

import { ACTIONS } from '../constants/index.js';
import type { VeneerAction } from '../types/index.js';

//The header the client sends to prove a request is not a cross site forgery.
//It carries the same value as the readable csrf cookie, which a cross site
//attacker cannot read, so they cannot forge a matching header.
export const CSRF_HEADER = 'x-veneer-csrf';

//The actions that change data and so need csrf protection.
//Public reads and the login and refresh bootstrap do not.
const PROTECTED: VeneerAction[] = [
  ACTIONS.CREATE_TAG,
  ACTIONS.UPDATE_CONTENT,
  ACTIONS.UPDATE_TAG_TYPE,
  ACTIONS.DELETE_TAG,
  ACTIONS.LOGOUT,
];

//Whether an action needs the csrf check.
export const requiresCsrf = (action: VeneerAction): boolean => PROTECTED.includes(action);
