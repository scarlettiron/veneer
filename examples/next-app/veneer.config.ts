import { defineConfig } from '@veneer/core';

//The single source of truth for this app.
//Secrets are read from the environment so they are not committed.
export default defineConfig({
  mode: 'embedded',
  editInView: true,
  apiBasePath: '/api/veneer',
  database: {
    provider: 'postgres',
    connectionString: process.env.DATABASE_URL,
  },
  auth: {
    provider: 'jwt',
    jwtSecret: process.env.VENEER_JWT_SECRET ?? 'replace-this-with-a-long-random-secret',
  },
});
