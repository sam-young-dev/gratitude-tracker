import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set (see .env.example)')
}

// One pool per server instance. The pooled Neon connection string does the real
// pooling, so each instance only needs a few connections.
const pool = new Pool({ connectionString, max: 5 })

export const db = drizzle(pool, { schema })
