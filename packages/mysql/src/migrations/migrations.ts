import { AUTH_TABLE, CONTENT_TABLE } from '@veneer/core';

//A single migration step.
//The id must never change once it has shipped, because it is how we
//remember that this step already ran.
export interface Migration {
  id: string;
  sql: string;
}

//The ordered list of migrations for MySQL and MariaDB.
//Add new steps to the end of this list, never edit or reorder old ones.
export const MIGRATIONS: Migration[] = [
  {
    id: '0001_create_content_table',
    sql: `
      CREATE TABLE IF NOT EXISTS \`${CONTENT_TABLE}\` (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        tag VARCHAR(255) NOT NULL UNIQUE,
        body TEXT NOT NULL,
        media_url TEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255) NULL
      );
    `,
  },
  {
    id: '0002_create_auth_table',
    sql: `
      CREATE TABLE IF NOT EXISTS \`${AUTH_TABLE}\` (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_veneer_role CHECK (role IN ('superuser', 'editor'))
      );
    `,
  },
  {
    id: '0003_add_content_type',
    sql: `
      ALTER TABLE \`${CONTENT_TABLE}\`
      ADD COLUMN type VARCHAR(16) NOT NULL DEFAULT 'plain';
    `,
  },
];
