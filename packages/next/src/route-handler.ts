import {
  CSRF_HEADER,
  VeneerError,
  resolveConfig,
  type VeneerConfig,
  type VeneerUserConfig,
} from '@veneer/core';
import {
  assertCsrf,
  createVeneerServer,
  parseCookies,
  resolveAuthCookie,
  toVeneerRequest,
  type NodeRequestHandler,
  type VeneerServer,
} from '@veneer/server';

//The functions Next expects to export from a route handler file.
//Mount POST in your app/api/veneer/route.ts file.
export interface VeneerRouteHandlers {
  POST: (request: Request) => Promise<Response>;

  //The underlying server, in case you need the adapters or want to close them.
  server: VeneerServer;
}

//Reads the bearer token from a web Request.
const readToken = (request: Request): string | undefined => {
  const header = request.headers.get('authorization');

  if (!header || !header.startsWith('Bearer ')) {
    return undefined;
  }

  const token = header.slice('Bearer '.length).trim();

  return token === '' ? undefined : token;
};

//Turns a normalized response into a web Response with JSON.
const toJsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

//Builds a Next route handler from your config.
//You can pass the config object straight from your veneer.config file.
//It fills in defaults, checks the config, and creates the server once.
export const createVeneerRouteHandler = (
  config: VeneerUserConfig | VeneerConfig,
): VeneerRouteHandlers => {
  const resolved = resolveConfig(config as VeneerUserConfig);
  const server = createVeneerServer(resolved);

  const POST = async (request: Request): Promise<Response> => {
    let body: unknown = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    try {
      //The access token can arrive as a bearer header or the access cookie.
      //The refresh token arrives as its own cookie.
      const cookies = parseCookies(request.headers.get('cookie') ?? undefined);
      const accessToken = readToken(request) ?? cookies[resolved.auth.cookieName];
      const refreshToken = cookies[resolved.auth.refreshCookieName];
      const veneerRequest = toVeneerRequest(body, accessToken, refreshToken);

      //Block cross site request forgery on the actions that change data.
      assertCsrf(
        resolved.auth,
        veneerRequest.action,
        cookies,
        request.headers.get(CSRF_HEADER) ?? undefined,
      );

      const response = await server.handle(veneerRequest);

      //In cookie mode this sets or clears the httpOnly cookies and keeps the
      //tokens out of the response body.
      const { setCookies, body: responseBody } = resolveAuthCookie(
        resolved.auth,
        veneerRequest.action,
        response,
      );

      const responseHeaders = new Headers({ 'Content-Type': 'application/json' });

      for (const cookie of setCookies) {
        responseHeaders.append('Set-Cookie', cookie);
      }

      return new Response(JSON.stringify(responseBody), {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (error) {
      if (error instanceof VeneerError) {
        return toJsonResponse(error.status, { error: error.code, message: error.message });
      }

      const message = error instanceof Error ? error.message : 'Unknown error';

      return toJsonResponse(500, { error: 'internal_error', message });
    }
  };

  return { POST, server };
};

//Builds a Pages Router API handler from your config.
//Use this in a pages/api file. It returns a Node style (req, res) handler,
//which is what the Pages Router expects, unlike the App Router web handler above.
//Remember to turn off Next's body parser in that file so Veneer can read the
//raw request body:
//
//  export const config = { api: { bodyParser: false } };
//
export const createVeneerPagesApiRoute = (
  config: VeneerUserConfig | VeneerConfig,
): NodeRequestHandler => {
  const resolved = resolveConfig(config as VeneerUserConfig);
  const server = createVeneerServer(resolved);

  return server.nodeHandler;
};
