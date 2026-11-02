import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL_UNPOOLED
if (!url) {
  throw new Error('DATABASE_URL_UNPOOLED is not set (see .env.example)')
}

// Migrations run over the direct (unpooled) connection; the app uses the pooled one.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema',
  out: './drizzle',
  dbCredentials: { url },
})
