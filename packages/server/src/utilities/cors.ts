import type { IncomingMessage, ServerResponse } from 'node:http';

import type { CorsConfig } from '@veneer/core';

//Adds the cross origin headers when cors is configured, and answers the
//browser's preflight request. Returns true when the request was a preflight
//that has been fully handled, so the caller should stop.
export const applyCors = (
  req: IncomingMessage,
  res: ServerResponse,
  cors: CorsConfig | undefined,
): boolean => {
  if (!cors) {
    return false;
  }

  const requestOrigin = req.headers.origin;
  let allowOrigin: string | null = null;

  if (cors.origins === '*') {
    allowOrigin = '*';
  } else if (requestOrigin && cors.origins.includes(requestOrigin)) {
    //Only reflect the origin back when it is on the allowed list.
    allowOrigin = requestOrigin;
  }

  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  //The browser sends an OPTIONS request first to check permission.
  //We answer it here with no body.
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();

    return true;
  }

  return false;
};
