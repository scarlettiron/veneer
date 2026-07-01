import Database from 'better-sqlite3';

import {
  conflict,
  notFound,
  type Actor,
  type ContentInput,
  type ContentRecord,
  type CreateUserInput,
  type DatabaseConfig,
  type DbAdapter,
  type StoredUser,
  type TagType,
  AUTH_TABLE,
  CONTENT_TABLE,
} from '@veneer/core';

import { CONSTRAINT_ERROR_PREFIX, MIGRATIONS_TABLE } from './constants/index.js';
import { MIGRATIONS, type Migration } from './migrations/migrations.js';
import { mapContentRow, mapUserRow } from './utilities/row-mappers.js';

//Works out the database file path from the config.
//Accepts a plain path, or a filename with a file: or sqlite: prefix.
const resolveFilename = (config: DatabaseConfig): string => {
  const raw = config.filename ?? config.connectionString;

  if (!raw) {
    throw new Error('The sqlite adapter needs a "filename" in the database config');
  }

  return raw.replace(/^sqlite:/, '').replace(/^file:/, '');
};

//Reads a SQLite error code in a type safe way.
const errorCode = (error: unknown): string | undefined => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code: unknown }).code);
  }

  return undefined;
};

//Whether an error is a broken unique or primary key constraint.
const isConstraintError = (error: unknown): boolean =>
  (errorCode(error) ?? '').startsWith(CONSTRAINT_ERROR_PREFIX);

//The SQLite implementation of the Veneer database adapter.
//better-sqlite3 is synchronous, so each method wraps a quick synchronous call.
export class SqliteAdapter implements DbAdapter {
  private readonly db: Database.Database;

  constructor(config: DatabaseConfig) {
    this.db = new Database(resolveFilename(config));

    //Write ahead logging gives better behavior when reads and writes overlap.
    this.db.pragma('journal_mode = WAL');
  }

  public async runMigrations(): Promise<void> {
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,
    );

    const applied = this.db
      .prepare(`SELECT id FROM "${MIGRATIONS_TABLE}";`)
      .all() as Array<{ id: string }>;
    const appliedIds = new Set(applied.map((row) => row.id));

    //Each migration runs inside a transaction so a failure leaves a clean state.
    const runMigration = this.db.transaction((migration: Migration) => {
      this.db.exec(migration.sql);
      this.db.prepare(`INSERT INTO "${MIGRATIONS_TABLE}" (id) VALUES (?);`).run(migration.id);
    });

    for (const migration of MIGRATIONS) {
      if (!appliedIds.has(migration.id)) {
        runMigration(migration);
      }
    }
  }

  public async getContentByTags(tags: string[]): Promise<ContentRecord[]> {
    if (tags.length === 0) {
      return [];
    }

    const placeholders = tags.map(() => '?').join(', ');

    const rows = this.db
      .prepare(
        `SELECT tag, type, body, media_url, updated_at, updated_by
         FROM "${CONTENT_TABLE}"
         WHERE tag IN (${placeholders});`,
      )
      .all(...tags) as never[];

    return rows.map((row) => mapContentRow(row));
  }

  public async createTag(tag: string, type: TagType, actor: Actor): Promise<ContentRecord> {
    try {
      this.db
        .prepare(
          `INSERT INTO "${CONTENT_TABLE}" (tag, type, body, media_url, updated_by)
           VALUES (?, ?, '', NULL, ?);`,
        )
        .run(tag, type, actor.userId);
    } catch (error) {
      if (isConstraintError(error)) {
        throw conflict(`The tag "${tag}" already exists`);
      }

      throw error;
    }

    const [record] = await this.getContentByTags([tag]);

    if (!record) {
      throw new Error('The tag could not be read back after it was created');
    }

    return record;
  }

  public async upsertContent(input: ContentInput, actor: Actor): Promise<ContentRecord> {
    this.db
      .prepare(
        `INSERT INTO "${CONTENT_TABLE}" (tag, body, media_url, updated_by)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(tag) DO UPDATE SET
           body = excluded.body,
           media_url = excluded.media_url,
           updated_at = datetime('now'),
           updated_by = excluded.updated_by;`,
      )
      .run(input.tag, input.body, input.mediaUrl ?? null, actor.userId);

    const [record] = await this.getContentByTags([input.tag]);

    if (!record) {
      throw new Error('The content could not be read back after it was saved');
    }

    return record;
  }

  public async deleteTag(tag: string): Promise<void> {
    const result = this.db.prepare(`DELETE FROM "${CONTENT_TABLE}" WHERE tag = ?;`).run(tag);

    if (result.changes === 0) {
      throw notFound(`The tag "${tag}" does not exist`);
    }
  }

  public async listTags(): Promise<string[]> {
    const rows = this.db
      .prepare(`SELECT tag FROM "${CONTENT_TABLE}" ORDER BY tag ASC;`)
      .all() as Array<{ tag: string }>;

    return rows.map((row) => row.tag);
  }

  public async findUserByEmail(email: string): Promise<StoredUser | null> {
    const row = this.db
      .prepare(`SELECT id, email, password_hash, role FROM "${AUTH_TABLE}" WHERE email = ?;`)
      .get(email) as never;

    return row ? mapUserRow(row) : null;
  }

  public async findUserById(id: string): Promise<StoredUser | null> {
    const row = this.db
      .prepare(`SELECT id, email, password_hash, role FROM "${AUTH_TABLE}" WHERE id = ?;`)
      .get(id) as never;

    return row ? mapUserRow(row) : null;
  }

  public async createUser(input: CreateUserInput): Promise<StoredUser> {
    try {
      const result = this.db
        .prepare(`INSERT INTO "${AUTH_TABLE}" (email, password_hash, role) VALUES (?, ?, ?);`)
        .run(input.email, input.passwordHash, input.role);

      return {
        id: String(result.lastInsertRowid),
        email: input.email,
        role: input.role,
        passwordHash: input.passwordHash,
      };
    } catch (error) {
      if (isConstraintError(error)) {
        throw conflict(`A user with the email "${input.email}" already exists`);
      }

      throw error;
    }
  }

  public async close(): Promise<void> {
    this.db.close();
  }
}
