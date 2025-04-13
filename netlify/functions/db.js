const { drizzle } = require('drizzle-orm/node-postgres');
const pg = require('pg');
const schema = require('./schema');

const { Pool } = pg;

// Create a PostgreSQL connection pool
console.log("*** DATABASE_URL", process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create a Drizzle instance using the pool and schema
const db = drizzle(pool, { schema });

// Export the pool for use with the session store
module.exports = { db, pool };