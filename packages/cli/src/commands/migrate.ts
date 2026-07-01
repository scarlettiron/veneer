import { createVeneerServerFromConfig } from '@veneer/server';

//Runs any database migrations that have not run yet.
//Reads the database connection from the veneer.config file.
export const runMigrate = async (flags: Record<string, string>): Promise<number> => {
  const server = await createVeneerServerFromConfig({ path: flags.config });

  try {
    await server.db.runMigrations();
    console.log('Veneer migrations are up to date.');

    return 0;
  } finally {
    await server.close();
  }
};
