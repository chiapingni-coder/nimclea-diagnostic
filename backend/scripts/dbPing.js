import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const pool = new Pool({ connectionString });

try {
  const result = await pool.query("select now() as now");
  console.log("DB connected", result.rows?.[0]?.now);
} catch (error) {
  console.error("DB connection failed", error?.message || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
