import type { IncomingMessage } from 'node:http';

import { type VeneerAction, type VeneerRequest, badRequest } from '@veneer/core';

//The most a request body is allowed to be, to avoid runaway memory use.
const MAX_BODY_BYTES = 1_000_000;

//Reads the whole request body and parses it as JSON.
//Returns an empty object when the body is empty.
export const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    total += buffer.length;

    if (total > MAX_BODY_BYTES) {
      throw badRequest('The request body is too large');
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();

  if (raw === '') {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw badRequest('The request body must be valid JSON');
  }
};

//Pulls the bearer token out of the Authorization header, if there is one.
export const readBearerToken = (req: IncomingMessage): string | undefined => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return undefined;
  }

  const token = header.slice('Bearer '.length).trim();

  return token === '' ? undefined : token;
};

//Turns a parsed JSON body into a normalized Veneer request.
//The body must contain an action, and may contain a payload.
export const toVeneerRequest = (body: unknown, authToken: string | undefined): VeneerRequest => {
  if (typeof body !== 'object' || body === null) {
    throw badRequest('The request body must be an object with an action');
  }

  const action = (body as Record<string, unknown>).action;

  if (typeof action !== 'string') {
    throw badRequest('The request body must include an action');
  }

  return {
    action: action as VeneerAction,
    payload: (body as Record<string, unknown>).payload,
    authToken,
  };
};
