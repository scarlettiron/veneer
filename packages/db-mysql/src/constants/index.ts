//The table Veneer uses to remember which migrations have already run.
export const MIGRATIONS_TABLE = '__Veneer_Migrations__';

//MySQL and MariaDB error code for a duplicate unique value.
//We use this to turn a duplicate insert into a friendly conflict error.
export const DUPLICATE_ENTRY = 'ER_DUP_ENTRY';
