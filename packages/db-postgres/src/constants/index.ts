//Veneer
//Licensed under the MIT License. See the LICENSE file in the project root.
//Copyright (c) 2026 Scarlett A. Scott (codescarlett)
//
//Contributors:
//Scarlett A. Scott (codescarlett)

//The table Veneer uses to remember which migrations have already run.
export const MIGRATIONS_TABLE = '__Veneer_Migrations__';

//Postgres error code for a unique constraint violation.
//We use this to turn a duplicate insert into a friendly conflict error.
export const UNIQUE_VIOLATION = '23505';
