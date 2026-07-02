import { beforeEach, describe, expect, it } from 'vitest';

import {
  ACTIONS,
  createHandler,
  type Actor,
  type AuthAdapter,
  type AuthUser,
  type ContentInput,
  type ContentRecord,
  type CreateUserInput,
  type DbAdapter,
  type RefreshTokenRecord,
  type StoredUser,
  type TagType,
  type VeneerConfig,
  type VeneerHandler,
} from '@veneer/core';

//A tiny in memory database so we can test the handler without Postgres.
class FakeDb implements DbAdapter {
  public content = new Map<string, ContentRecord>();

  async runMigrations(): Promise<void> {}

  async getContentByTags(tags: string[]): Promise<ContentRecord[]> {
    const records: ContentRecord[] = [];

    for (const tag of tags) {
      const record = this.content.get(tag);

      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  async createTag(tag: string, type: TagType, actor: Actor): Promise<ContentRecord> {
    const record: ContentRecord = {
      tag,
      type,
      body: '',
      mediaUrl: null,
      updatedAt: null,
      updatedBy: actor.userId,
    };

    this.content.set(tag, record);

    return record;
  }

  async upsertContent(input: ContentInput, actor: Actor): Promise<ContentRecord> {
    const record: ContentRecord = {
      tag: input.tag,
      type: this.content.get(input.tag)?.type ?? 'plain',
      body: input.body,
      mediaUrl: input.mediaUrl ?? null,
      updatedAt: '2026-01-01T00:00:00.000Z',
      updatedBy: actor.userId,
    };

    this.content.set(input.tag, record);

    return record;
  }

  async setTagType(tag: string, type: TagType): Promise<ContentRecord> {
    const existing = this.content.get(tag);

    if (!existing) {
      throw new Error('not found');
    }

    const record: ContentRecord = { ...existing, type };
    this.content.set(tag, record);

    return record;
  }

  async deleteTag(tag: string): Promise<void> {
    this.content.delete(tag);
  }

  async listTags(): Promise<string[]> {
    return Array.from(this.content.keys());
  }

  async findUserByEmail(): Promise<StoredUser | null> {
    return null;
  }

  async findUserById(id: string): Promise<StoredUser | null> {
    return { id, email: 'user@example.com', role: 'superuser', passwordHash: 'x' };
  }

  async createUser(input: CreateUserInput): Promise<StoredUser> {
    return { id: '1', email: input.email, role: input.role, passwordHash: input.passwordHash };
  }

  async updateUserPassword(): Promise<boolean> {
    return true;
  }

  async listUsers(): Promise<AuthUser[]> {
    return [];
  }

  async saveRefreshToken(): Promise<void> {}

  async findRefreshToken(): Promise<RefreshTokenRecord | null> {
    return null;
  }

  async revokeRefreshToken(): Promise<void> {}

  async revokeRefreshFamily(): Promise<void> {}

  async close(): Promise<void> {}
}

//A fake auth adapter that maps known tokens to actors.
const fakeAuth: AuthAdapter = {
  async login() {
    return {
      accessToken: 'super',
      refreshToken: 'super-refresh',
      user: { id: '1', email: 'user@example.com', role: 'superuser' },
    };
  },
  async verify(token: string): Promise<Actor | null> {
    if (token === 'super') {
      return { userId: '1', role: 'superuser' };
    }

    if (token === 'editor') {
      return { userId: '2', role: 'editor' };
    }

    return null;
  },
  async refresh(refreshToken: string) {
    if (refreshToken === 'super-refresh') {
      return {
        accessToken: 'super',
        refreshToken: 'super-refresh',
        user: { id: '1', email: 'user@example.com', role: 'superuser' },
      };
    }

    return null;
  },
  async logout() {},
  async hashPassword(password: string) {
    return `hash:${password}`;
  },
  async createUser() {
    return { userId: '1', role: 'superuser' };
  },
};

describe('request handler', () => {
  let db: FakeDb;
  let handle: VeneerHandler;

  beforeEach(() => {
    db = new FakeDb();
    handle = createHandler({ db, auth: fakeAuth, config: {} as VeneerConfig });
  });

  it('reads content without a token', async () => {
    await db.createTag('hero-title', 'plain', { userId: '1', role: 'superuser' });

    const response = await handle({ action: ACTIONS.GET_CONTENT, payload: { tags: ['hero-title'] } });

    expect(response.status).toBe(200);
    expect((response.body.content as ContentRecord[]).length).toBe(1);
  });

  it('refuses tag creation without a token', async () => {
    const response = await handle({ action: ACTIONS.CREATE_TAG, payload: { tag: 'new-tag' } });

    expect(response.status).toBe(401);
  });

  it('refuses tag creation for an editor', async () => {
    const response = await handle({
      action: ACTIONS.CREATE_TAG,
      payload: { tag: 'new-tag' },
      authToken: 'editor',
    });

    expect(response.status).toBe(403);
  });

  it('allows tag creation for a superuser', async () => {
    const response = await handle({
      action: ACTIONS.CREATE_TAG,
      payload: { tag: 'new-tag' },
      authToken: 'super',
    });

    expect(response.status).toBe(201);
    expect(db.content.has('new-tag')).toBe(true);
  });

  it('rejects an invalid tag name', async () => {
    const response = await handle({
      action: ACTIONS.CREATE_TAG,
      payload: { tag: 'Not A Tag' },
      authToken: 'super',
    });

    expect(response.status).toBe(400);
  });

  it('stops an editor from editing a tag that does not exist', async () => {
    const response = await handle({
      action: ACTIONS.UPDATE_CONTENT,
      payload: { tag: 'missing-tag', body: 'hello' },
      authToken: 'editor',
    });

    expect(response.status).toBe(403);
  });

  it('lets an editor edit a tag that already exists', async () => {
    await db.createTag('hero-title', 'plain', { userId: '1', role: 'superuser' });

    const response = await handle({
      action: ACTIONS.UPDATE_CONTENT,
      payload: { tag: 'hero-title', body: 'updated' },
      authToken: 'editor',
    });

    expect(response.status).toBe(200);
    expect(db.content.get('hero-title')?.body).toBe('updated');
  });
});
