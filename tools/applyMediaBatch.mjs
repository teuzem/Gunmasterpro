import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const [sqlPath] = process.argv.slice(2);
if (!sqlPath) throw new Error("Usage: node tools/applyMediaBatch.mjs <sql-path>");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL unavailable");
const sql = await readFile(sqlPath, "utf8");
const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL, multipleStatements: true });
try {
  await connection.beginTransaction();
  await connection.query(sql);
  await connection.commit();
  console.log(`Applied ${sqlPath}`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
