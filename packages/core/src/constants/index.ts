//Names of the database tables that Veneer owns.
//These are deliberately verbose so they do not clash with host application tables.
export const CONTENT_TABLE = '__Content_Editable__';
export const AUTH_TABLE = '__Auth__Static_Editor';

//The two roles a user can have.
//A superuser can create new tags and edit any content.
//An editor can only edit content for tags that already exist.
export const ROLES = {
  SUPERUSER: 'superuser',
  EDITOR: 'editor',
} as const;

//The kinds of content a tag can hold.
//plain is normal text, rich is formatted html, and media is an image or file url.
export const TAG_TYPES = {
  PLAIN: 'plain',
  RICH: 'rich',
  MEDIA: 'media',
} as const;

//Every action the request handler understands.
//The client and the handler both refer to these by name.
export const ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  ME: 'me',
  GET_CONTENT: 'getContent',
  LIST_TAGS: 'listTags',
  CREATE_TAG: 'createTag',
  UPDATE_CONTENT: 'updateContent',
  UPDATE_TAG_TYPE: 'updateTagType',
  DELETE_TAG: 'deleteTag',
} as const;

//Stable error codes the client can branch on.
export const ERROR_CODES = {
  BAD_REQUEST: 'bad_request',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  INTERNAL: 'internal_error',
} as const;

//Editable elements carry an attribute that bakes the tag name into the name itself.
//A tag named "hero-title" becomes the attribute "data-veneer-hero-title".
export const DATA_ATTRIBUTE_PREFIX = 'data-veneer-';

//Tag names live inside an html attribute name, so they may only use
//lowercase letters, numbers, and single hyphens between groups.
export const TAG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

//Default values used when the user config leaves a field out.
export const DEFAULT_MODE = 'embedded';
export const DEFAULT_API_BASE_PATH = '/api/veneer';
export const DEFAULT_EDIT_IN_VIEW = false;
export const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 8;

//File names the config loader will look for, in order.
export const CONFIG_FILE_NAMES = [
  'veneer.config.ts',
  'veneer.config.mts',
  'veneer.config.js',
  'veneer.config.mjs',
  'veneer.config.cjs',
];
