import type { Actor, AuthResult, Role } from '../types/index.js';

//The auth adapter hides how login and tokens actually work.
//The jwt adapter is one implementation, and other providers can be added later.
export interface AuthAdapter {
  //Check an email and password and return a token plus the public user.
  //Throws a VeneerError when the details are wrong.
  login(email: string, password: string): Promise<AuthResult>;

  //Turn a token back into an actor, or return null when the token is invalid.
  verify(token: string): Promise<Actor | null>;

  //End a session.
  //Stateless tokens cannot really be revoked, so this may do nothing for now.
  logout(token: string): Promise<void>;

  //Hash a plain password so it can be stored safely.
  //The CLI uses this when it creates the first superuser.
  hashPassword(password: string): Promise<string>;

  //Create a user record using the underlying user store.
  //The role decides what the user is allowed to do.
  createUser(email: string, password: string, role: Role): Promise<Actor>;
}
