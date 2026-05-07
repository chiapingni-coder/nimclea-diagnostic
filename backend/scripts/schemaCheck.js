import getPool from "../db/pool.js";

const REQUIRED_TABLES = [
  "users",
  "cases",
  "diagnostic_records",
  "case_plan_records",
  "case_result_records",
  "event_logs",
  "receipt_records",
  "verification_records",
  "hash_ledger",
  "email_logs",
];

const pool = getPool();

try {
  const result = await pool.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1)
    `,
    [REQUIRED_TABLES]
  );

  const foundTables = new Set(result.rows.map((row) => row.table_name));
  const missingTables = REQUIRED_TABLES.filter((tableName) => !foundTables.has(tableName));

  if (missingTables.length > 0) {
    console.error("Schema check failed. Missing tables:", missingTables.join(", "));
    process.exitCode = 1;
  } else {
    console.log("Schema check passed: 10/10 tables found");
  }
} catch (error) {
  console.error("Schema check failed:", error?.message || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
