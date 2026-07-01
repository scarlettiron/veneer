import { describe, expect, it } from 'vitest';

import { JwtAuthAdapter } from '@veneer/auth-jwt';
import type { CreateUserInput, StoredUser, UserStore } from '@veneer/core';

//A simple in memory user store for the auth tests.
class MemoryUserStore implements UserStore {
  private users: StoredUser[] = [];

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
}

const buildAdapter = (): { store: MemoryUserStore; adapter: JwtAuthAdapter } => {
  const store = new MemoryUserStore();
  const adapter = new JwtAuthAdapter(store, {
    secret: 'a-secret-that-is-long-enough',
    tokenTtlSeconds: 3600,
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

    const actor = await adapter.verify(result.token);

    expect(actor).not.toBeNull();
    expect(actor?.role).toBe('superuser');
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
