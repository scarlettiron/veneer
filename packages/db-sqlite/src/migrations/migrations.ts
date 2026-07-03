//TweakTags
//Licensed under the MIT License. See the LICENSE file in the project root.
//Copyright (c) 2026 Scarlett A. Scott (codescarlett)
//
//Contributors:
//Scarlett A. Scott (codescarlett)

import { AUTH_TABLE, CONTENT_TABLE, REFRESH_TABLE } from '@tweaktags/core';

//A single migration step.
//The id must never change once it has shipped, because it is how we
//remember that this step already ran.
export interface Migration {
  id: string;
  sql: string;
}

//The ordered list of migrations for SQLite.
//Add new steps to the end of this list, never edit or reorder old ones.
export const MIGRATIONS: Migration[] = [
  {
    id: '0001_create_content_table',
    sql: `
      CREATE TABLE IF NOT EXISTS "${CONTENT_TABLE}" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag TEXT NOT NULL UNIQUE,
        body TEXT NOT NULL DEFAULT '',
        media_url TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_by TEXT
      );
    `,
  },
  {
    id: '0002_create_auth_table',
    sql: `
      CREATE TABLE IF NOT EXISTS "${AUTH_TABLE}" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('superuser', 'editor')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
  {
    id: '0003_add_content_type',
    sql: `
      ALTER TABLE "${CONTENT_TABLE}"
      ADD COLUMN type TEXT NOT NULL DEFAULT 'plain';
    `,
  },
  {
    id: '0004_create_refresh_tokens',
    sql: `
      CREATE TABLE IF NOT EXISTS "${REFRESH_TABLE}" (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked INTEGER NOT NULL DEFAULT 0
      );
    `,
  },
];
