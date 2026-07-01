import type {
  Actor,
  ContentInput,
  ContentRecord,
  CreateUserInput,
  StoredUser,
  TagType,
} from '../types/index.js';

//The part of the database adapter that deals with users.
//The auth adapter is given one of these so it can read and write users
//without knowing which database is underneath.
export interface UserStore {
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserById(id: string): Promise<StoredUser | null>;
  createUser(input: CreateUserInput): Promise<StoredUser>;
}

//The full database adapter.
//A concrete adapter, like the Postgres one, implements every method here.
export interface DbAdapter extends UserStore {
  //Create the Veneer tables if they do not exist yet.
  runMigrations(): Promise<void>;

  //Read the content rows for a set of tags.
  //Tags with no row simply do not appear in the result.
  getContentByTags(tags: string[]): Promise<ContentRecord[]>;

  //Create a brand new tag with empty content and the given type.
  //Only a superuser should reach this method.
  createTag(tag: string, type: TagType, actor: Actor): Promise<ContentRecord>;

  //Save the body and media url for a tag.
  //The handler decides who is allowed to call this.
  upsertContent(input: ContentInput, actor: Actor): Promise<ContentRecord>;

  //Delete a tag and its content.
  //Only a superuser should reach this method.
  deleteTag(tag: string, actor: Actor): Promise<void>;

  //List every tag that currently has a row.
  listTags(): Promise<string[]>;

  //Close any open database connections.
  close(): Promise<void>;
}
