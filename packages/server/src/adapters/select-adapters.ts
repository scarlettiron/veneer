import { createRequire } from 'node:module';

import { JwtAuthAdapter } from '@veneer/auth-jwt';
import { PostgresAdapter } from '@veneer/db-postgres';
import { badRequest, type AuthAdapter, type DbAdapter, type VeneerConfig } from '@veneer/core';

//Lets us load an optional adapter package by name at runtime, so a project only
//needs to install the database package it actually uses.
const requirePackage = createRequire(import.meta.url);

//Loads an optional adapter package and gives a clear error when it is missing.
//installName is the package to tell people to install, which can differ from
//the one we load. MariaDB installs @veneer/db-mariadb but loads @veneer/db-mysql.
const loadAdapter = (
  packageName: string,
  provider: string,
  installName: string = packageName,
): Record<string, unknown> => {
  try {
    return requirePackage(packageName) as Record<string, unknown>;
  } catch {
    throw badRequest(
      `The "${installName}" package is needed for the "${provider}" database. ` +
        `Install it in your project to use this database.`,
    );
  }
};

//Builds the database adapter that matches the config provider.
//Postgres ships with the server. MySQL, MariaDB, and SQLite are loaded from
//their own packages when you use them, so you only install what you need.
export const buildDbAdapter = (config: VeneerConfig): DbAdapter => {
  const provider = config.database.provider;

  if (provider === 'postgres') {
    return new PostgresAdapter(config.database);
  }

  if (provider === 'mysql' || provider === 'mariadb') {
    //MariaDB uses the same driver, so we always load @veneer/db-mysql, but we
    //point MariaDB users at the @veneer/db-mariadb package to install.
    const installName = provider === 'mariadb' ? '@veneer/db-mariadb' : '@veneer/db-mysql';
    const module = loadAdapter('@veneer/db-mysql', provider, installName);
    const MysqlAdapter = module.MysqlAdapter as new (config: VeneerConfig['database']) => DbAdapter;

    return new MysqlAdapter(config.database);
  }

  if (provider === 'sqlite') {
    const module = loadAdapter('@veneer/db-sqlite', provider);
    const SqliteAdapter = module.SqliteAdapter as new (
      config: VeneerConfig['database'],
    ) => DbAdapter;

    return new SqliteAdapter(config.database);
  }

  throw badRequest(`Unsupported database provider "${String(provider)}"`);
};

//Builds the auth adapter that matches the config provider.
//The auth adapter needs the database adapter so it can read and write users.
export const buildAuthAdapter = (config: VeneerConfig, db: DbAdapter): AuthAdapter => {
  if (config.auth.provider === 'jwt') {
    return new JwtAuthAdapter(db, {
      secret: config.auth.jwtSecret,
      accessTtlSeconds: config.auth.accessTtlSeconds,
      refreshTtlSeconds: config.auth.refreshTtlSeconds,
      strictRevocation: config.auth.strictRevocation,
    });
  }

  throw badRequest(`Unsupported auth provider "${String(config.auth.provider)}"`);
};
