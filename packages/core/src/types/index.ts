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

//The auth settings.
//For now the only provider is jwt, which signs JSON Web Tokens.
export interface AuthConfig {
  provider: 'jwt';
  jwtSecret: string;
  tokenTtlSeconds?: number;
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
  auth: Required<Pick<AuthConfig, 'provider' | 'jwtSecret' | 'tokenTtlSeconds'>>;
  cors?: CorsConfig;
}

//The result of a successful login.
export interface AuthResult {
  token: string;
  user: AuthUser;
}

//A request that has been normalized away from any specific web framework.
export interface VeneerRequest {
  action: VeneerAction;
  payload?: unknown;
  authToken?: string;
}

//A response that has been normalized away from any specific web framework.
export interface VeneerResponse {
  status: number;
  body: Record<string, unknown>;
}
