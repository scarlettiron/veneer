//The table Veneer uses to remember which migrations have already run.
export const MIGRATIONS_TABLE = '__Veneer_Migrations__';

//The start of the SQLite error code for a broken unique or primary key.
//We use this to turn a duplicate insert into a friendly conflict error.
export const CONSTRAINT_ERROR_PREFIX = 'SQLITE_CONSTRAINT';
