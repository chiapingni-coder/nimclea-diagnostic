import pg from "pg";

const { Pool } = pg;

let pool = null;

export function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize the database pool.");
  }

  if (!pool) {
    pool = new Pool({ connectionString });
  }

  return pool;
}

export default getPool;
