import { describe, expect, it } from 'vitest';

import { JwtAuthAdapter } from '@veneer/auth-jwt';
import type {
  CreateUserInput,
  RefreshTokenRecord,
  RefreshTokenStore,
  StoredUser,
  UserStore,
} from '@veneer/core';

//A simple in memory store for the auth tests, holding users and refresh tokens.
class MemoryStore implements UserStore, RefreshTokenStore {
  private users: StoredUser[] = [];

  private refreshTokens = new Map<string, RefreshTokenRecord>();

  private nextId = 1;

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findUserById(id: string): Promise<StoredUser | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async createUser(input: CreateUserInput): Promise<StoredUser> {
    const user: StoredUser = {
      id: String(this.nextId),
      email: input.email,
      role: input.role,
      passwordHash: input.passwordHash,
    };

    this.nextId += 1;
    this.users.push(user);

    return user;
  }

  async updateUserPassword(): Promise<boolean> {
    return true;
  }

  async saveRefreshToken(record: RefreshTokenRecord): Promise<void> {
    this.refreshTokens.set(record.id, { ...record });
  }

  async findRefreshToken(id: string): Promise<RefreshTokenRecord | null> {
    return this.refreshTokens.get(id) ?? null;
  }

  async revokeRefreshToken(id: string): Promise<void> {
    const record = this.refreshTokens.get(id);

    if (record) {
      record.revoked = true;
    }
  }

  async revokeRefreshFamily(familyId: string): Promise<void> {
    for (const record of this.refreshTokens.values()) {
      if (record.familyId === familyId) {
        record.revoked = true;
      }
    }
  }

  async isRefreshFamilyActive(familyId: string): Promise<boolean> {
    for (const record of this.refreshTokens.values()) {
      if (record.familyId === familyId && !record.revoked) {
        return true;
      }
    }

    return false;
  }
}

const buildAdapter = (): { store: MemoryStore; adapter: JwtAuthAdapter } => {
  const store = new MemoryStore();
  const adapter = new JwtAuthAdapter(store, {
    secret: 'a-secret-that-is-long-enough',
    accessTtlSeconds: 900,
    refreshTtlSeconds: 604800,
    strictRevocation: true,
  });

  return { store, adapter };
};

describe('jwt auth adapter', () => {
  it('creates a user, signs them in, and verifies the token', async () => {
    const { adapter } = buildAdapter();

    await adapter.createUser('admin@example.com', 'supersecret', 'superuser');

    const result = await adapter.login('admin@example.com', 'supersecret');

    expect(result.user.email).toBe('admin@example.com');
    expect(result.user.role).toBe('superuser');

    const actor = await adapter.verify(result.accessToken);

    expect(actor).not.toBeNull();
    expect(actor?.role).toBe('superuser');
  });

  it('refreshes with a valid refresh token and rejects an access token there', async () => {
    const { adapter } = buildAdapter();

    await adapter.createUser('admin@example.com', 'supersecret', 'superuser');
    const result = await adapter.login('admin@example.com', 'supersecret');

    //A refresh token gives a new pair of tokens.
    const refreshed = await adapter.refresh(result.refreshToken);
    expect(refreshed).not.toBeNull();
    expect(refreshed?.user.email).toBe('admin@example.com');

    //An access token must not work as a refresh token.
    expect(await adapter.refresh(result.accessToken)).toBeNull();

    //A refresh token must not work as an access token.
    expect(await adapter.verify(result.refreshToken)).toBeNull();
  });

  it('rotates the refresh token and revokes the family when an old one is reused', async () => {
    const { adapter } = buildAdapter();

    await adapter.createUser('admin@example.com', 'supersecret', 'superuser');
    const login = await adapter.login('admin@example.com', 'supersecret');

    //Use the refresh token once to rotate it.
    const rotated = await adapter.refresh(login.refreshToken);
    expect(rotated).not.toBeNull();

    //Reusing the original, now rotated, refresh token is treated as theft.
    expect(await adapter.refresh(login.refreshToken)).toBeNull();

    //The reuse revoked the whole family, so the newer token no longer works either.
    expect(await adapter.refresh(rotated?.refreshToken ?? '')).toBeNull();
  });

  it('rejects an access token after logout when strict revocation is on', async () => {
    const { adapter } = buildAdapter();

    await adapter.createUser('admin@example.com', 'supersecret', 'superuser');
    const login = await adapter.login('admin@example.com', 'supersecret');

    //The access token works while the session is active.
    expect(await adapter.verify(login.accessToken)).not.toBeNull();

    //After logging out, the same access token is rejected right away.
    await adapter.logout(login.refreshToken);
    expect(await adapter.verify(login.accessToken)).toBeNull();
  });

  it('rejects a wrong password', async () => {
    const { adapter } = buildAdapter();

    await adapter.createUser('admin@example.com', 'supersecret', 'superuser');

    await expect(adapter.login('admin@example.com', 'wrong')).rejects.toThrow();
  });

  it('returns null for a token that is not valid', async () => {
    const { adapter } = buildAdapter();

    const actor = await adapter.verify('not-a-real-token');

    expect(actor).toBeNull();
  });
});
