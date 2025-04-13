import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@shared/schema';

const { Pool } = pg;

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
console.log("*** DATABASE_URL", process.env.DATABASE_URL);
// Create a Drizzle instance using the pool and schema
export const db = drizzle(pool, { schema });

// Export the pool for use with the session store
export { pool };