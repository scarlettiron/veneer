import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
  unauthorized,
  type Actor,
  type AuthAdapter,
  type AuthResult,
  type Role,
  type UserStore,
} from '@veneer/core';

import { SALT_ROUNDS } from './constants/index.js';

//The settings the jwt adapter needs.
export interface JwtAuthOptions {
  secret: string;
  tokenTtlSeconds: number;
}

//Reads a role value safely, falling back to the editor role.
const toRole = (value: unknown): Role => (value === 'superuser' ? 'superuser' : 'editor');

//The jwt implementation of the Veneer auth adapter.
//It checks passwords with bcrypt and hands out signed tokens.
//It uses a user store, so it does not care which database is underneath.
export class JwtAuthAdapter implements AuthAdapter {
  private readonly users: UserStore;

  private readonly secret: string;

  private readonly tokenTtlSeconds: number;

  constructor(users: UserStore, options: JwtAuthOptions) {
    this.users = users;
    this.secret = options.secret;
    this.tokenTtlSeconds = options.tokenTtlSeconds;
  }

  public async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.findUserByEmail(email);

    //We use the same error whether the email or the password is wrong,
    //so an attacker cannot tell which part failed.
    if (!user) {
      throw unauthorized('The email or password is incorrect');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw unauthorized('The email or password is incorrect');
    }

    const token = jwt.sign({ sub: user.id, role: user.role }, this.secret, {
      expiresIn: this.tokenTtlSeconds,
    });

    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  public async verify(token: string): Promise<Actor | null> {
    try {
      const decoded = jwt.verify(token, this.secret);

      if (typeof decoded === 'string' || !decoded.sub) {
        return null;
      }

      return { userId: String(decoded.sub), role: toRole(decoded.role) };
    } catch {
      //Any verify failure, like an expired or tampered token, means no actor.
      return null;
    }
  }

  public async logout(): Promise<void> {
    //Tokens are stateless, so there is nothing to delete on the server.
    //The client should drop its copy of the token to end the session.
    return;
  }

  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  public async createUser(email: string, password: string, role: Role): Promise<Actor> {
    const passwordHash = await this.hashPassword(password);
    const user = await this.users.createUser({ email, passwordHash, role });

    return { userId: user.id, role: user.role };
  }
}
