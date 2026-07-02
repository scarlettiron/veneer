//The table Veneer uses to remember which migrations have already run.
export const MIGRATIONS_TABLE = '__Veneer_Migrations__';

//Postgres error code for a unique constraint violation.
//We use this to turn a duplicate insert into a friendly conflict error.
export const UNIQUE_VIOLATION = '23505';
