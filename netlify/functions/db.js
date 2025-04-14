const { drizzle } = require('drizzle-orm/node-postgres');
const pg = require('pg');
const schema = require('./schema');

const { Pool } = pg;

// Create a PostgreSQL connection pool
console.log("*** DATABASE_URL", process.env.DATABASE_URL);

let pool;
try {
  console.log('*** Creating database connection pool');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  console.log('*** Database pool created successfully');
  
  // Test the connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.log('*** Database connection test FAILED:', err.message);
    } else {
      console.log('*** Database connection test SUCCESSFUL:', res.rows[0]);
    }
  });
} catch (error) {
  console.log('*** Error creating database pool:', error.message);
  throw error;
}

// Create a Drizzle instance using the pool and schema
const db = drizzle(pool, { schema });

// Export the pool for use with the session store
module.exports = { db, pool };