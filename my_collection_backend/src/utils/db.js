import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
});

export async function pingDB() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

