import 'dotenv/config'
import pg from 'pg'

// Deletes only accounts this suite created; cascades remove their data.
export default async function globalTeardown() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  })
  try {
    await pool.query(`delete from "user" where email like 'e2e+%@example.com'`)
    await pool.query(`delete from rate_limit`)
  } finally {
    await pool.end()
  }
}
