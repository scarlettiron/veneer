import type { ACTIONS, ERROR_CODES, ROLES, TAG_TYPES } from '../constants/index.js';

//A role is one of the values defined in the ROLES constant.
export type Role = (typeof ROLES)[keyof typeof ROLES];

//A tag type is one of the values defined in the TAG_TYPES constant.
export type TagType = (typeof TAG_TYPES)[keyof typeof TAG_TYPES];

//An action is one of the values defined in the ACTIONS constant.
export type VeneerAction = (typeof ACTIONS)[keyof typeof ACTIONS];

//An error code is one of the values defined in the ERROR_CODES constant.
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

//The user performing an action, after their token has been verified.
export interface Actor {
  userId: string;
  role: Role;
}

//A user as the outside world sees them, without any secret fields.
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

//A user as stored in the database, including the password hash.
//Only the auth adapter and the database adapter should touch this shape.
export interface StoredUser extends AuthUser {
  passwordHash: string;
}

//The fields needed to create a new user row.
export interface CreateUserInput {
  email: string;
  role: Role;
  passwordHash: string;
}

//A single editable piece of content, keyed by its tag.
export interface ContentRecord {
  tag: string;
  //Whether this tag holds plain text, rich html, or a media url.
  type: TagType;
  body: string;
  mediaUrl: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

//The fields a caller can send when saving content.
export interface ContentInput {
  tag: string;
  body: string;
  mediaUrl?: string | null;
}

//Which databases Veneer can talk to.
//mysql and mariadb use the same driver, since MariaDB speaks the MySQL protocol.
export type DatabaseProvider = 'postgres' | 'mysql' | 'mariadb' | 'sqlite';

//The database connection settings.
//For servers, either give a full connection string or the individual parts.
//For sqlite, give a filename instead.
export interface DatabaseConfig {
  provider: DatabaseProvider;
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
  //The path to the database file, used only by sqlite.
  filename?: string;
}

//Where the browser keeps the login token.
//'cookie' uses a secure httpOnly cookie that JavaScript cannot read, which is
//the safest option and works for same origin apps. 'header' returns the token
//for the client to store and send itself, which is needed for a separate app on
//a different origin.
export type TokenStorage = 'cookie' | 'header';

//The auth settings.
//For now the only provider is jwt, which signs JSON Web Tokens.
export interface AuthConfig {
  provider: 'jwt';
  jwtSecret: string;

  //How long the short lived access token lasts, in seconds. Defaults to 15 minutes.
  accessTtlSeconds?: number;

  //How long the refresh token lasts, in seconds. Defaults to 7 days.
  //When this expires the user is signed out and must log back in.
  refreshTtlSeconds?: number;

  //When true, every request checks that the session has not been revoked, so a
  //logout or a revoked session ends access right away. This costs one database
  //read per request. When false, access tokens are stateless and simply expire.
  //Defaults to false.
  strictRevocation?: boolean;

  //How the browser holds the tokens. Defaults to 'cookie'.
  tokenStorage?: TokenStorage;

  //The access cookie name, defaults to 'veneer_token'.
  cookieName?: string;

  //The refresh cookie name, defaults to 'veneer_refresh'.
  refreshCookieName?: string;

  //Whether to protect against cross site request forgery. Defaults to true.
  //Set to false only if the csrf check is causing problems and you understand
  //the risk. It has no effect in header mode, which is already safe from csrf.
  csrfProtection?: boolean;

  //The csrf cookie name, defaults to 'veneer_csrf'. This cookie is readable by
  //the client so it can echo the value back in a header.
  csrfCookieName?: string;

  //Whether the cookies are marked Secure, so they only travel over https.
  //Defaults to true. Set to false only for local http development.
  cookieSecure?: boolean;

  //The cookie SameSite setting, defaults to 'lax'.
  //Use 'none' with Secure for a separate app on another origin.
  cookieSameSite?: 'strict' | 'lax' | 'none';
}

//The auth settings after defaults have been applied.
export interface ResolvedAuthConfig {
  provider: 'jwt';
  jwtSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  strictRevocation: boolean;
  tokenStorage: TokenStorage;
  cookieName: string;
  refreshCookieName: string;
  csrfProtection: boolean;
  csrfCookieName: string;
  cookieSecure: boolean;
  cookieSameSite: 'strict' | 'lax' | 'none';
}

//Cross origin settings, needed when the Veneer server runs on a different
//origin than the site that calls it, like a separate React app.
export interface CorsConfig {
  //Which origins may call the api.
  //Use '*' to allow any origin, or a list of exact origins like
  //['https://my-site.com', 'http://localhost:5173'].
  origins: string[] | '*';
}

//The config shape the user writes in veneer.config.ts.
//Most fields are optional because the loader fills in sensible defaults.
export interface VeneerUserConfig {
  mode?: 'embedded' | 'standalone';
  editInView?: boolean;
  //Turns on the rich text editor and lets tags be created with a type.
  richText?: boolean;
  apiBasePath?: string;
  database: DatabaseConfig;
  auth: AuthConfig;
  cors?: CorsConfig;
}

//The fully resolved config, after defaults have been applied.
//This is what the rest of the system actually uses.
export interface VeneerConfig {
  mode: 'embedded' | 'standalone';
  editInView: boolean;
  richText: boolean;
  apiBasePath: string;
  database: DatabaseConfig;
  auth: ResolvedAuthConfig;
  cors?: CorsConfig;
}

//One stored refresh token, used to rotate tokens and detect reuse.
//A family groups all the refresh tokens from one login. When an already used
//token is presented again, the whole family is revoked, which signs the session
//out everywhere because the token was probably stolen.
export interface RefreshTokenRecord {
  //A unique id for this token, the jti claim inside the refresh token.
  id: string;
  //The login family this token belongs to.
  familyId: string;
  //The user the token belongs to.
  userId: string;
  //When the token expires, as an iso string.
  expiresAt: string;
  //Whether this token has already been used or revoked.
  revoked: boolean;
}

//The result of a successful login or refresh.
//The access token authenticates requests, the refresh token gets a new access
//token when it expires.
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

//A request that has been normalized away from any specific web framework.
export interface VeneerRequest {
  action: VeneerAction;
  payload?: unknown;
  //The access token, from the access cookie or a bearer header.
  authToken?: string;
  //The refresh token, from the refresh cookie.
  refreshToken?: string;
}

//A response that has been normalized away from any specific web framework.
export interface VeneerResponse {
  status: number;
  body: Record<string, unknown>;
}
