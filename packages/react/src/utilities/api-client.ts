import type { VeneerAction } from '@veneer/core';

//The settings the api client needs.
//It asks for the token on every call so it always sends the latest one.
export interface ApiClientOptions {
  basePath: string;
  getToken: () => string | null;
}

//A small wrapper around fetch that talks to the Veneer backend handler.
//Every call is a POST with an action and an optional payload.
export interface ApiClient {
  request<T>(action: VeneerAction, payload?: unknown): Promise<T>;
}

//Builds an api client bound to a base path and a token getter.
export const createApiClient = ({ basePath, getToken }: ApiClientOptions): ApiClient => {
  const request = async <T>(action: VeneerAction, payload?: unknown): Promise<T> => {
    const token = getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(basePath, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, payload }),
    });

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const message =
        typeof data.message === 'string'
          ? data.message
          : `The request failed with status ${response.status}`;

      throw new Error(message);
    }

    return data as T;
  };

  return { request };
};
