// One-off: create (or reset) the limited `app_user` role the app connects as.
//
// Why: Neon's default owner role has BYPASSRLS, so row-level security never
// applies to it. The app must connect as a role without that privilege.
// Migrations keep using the owner (DATABASE_URL_UNPOOLED).
//
// Usage: node scripts/create-app-role.mjs
// Reads DATABASE_URL_UNPOOLED and DATABASE_URL from .env, creates/updates the
// role with a fresh random password, then rewrites DATABASE_URL in .env to use
// it. Nothing secret is printed. Run `drizzle-kit migrate` afterwards to grant
// table privileges (migration 0003).
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import pg from 'pg'

const ROLE = 'app_user'
const owner = process.env.DATABASE_URL_UNPOOLED
const runtime = process.env.DATABASE_URL
if (!owner || !runtime) {
  throw new Error('DATABASE_URL and DATABASE_URL_UNPOOLED must be set in .env')
}

const password = randomBytes(24).toString('hex')

const client = new pg.Client({ connectionString: owner })
await client.connect()
const exists = await client.query('select 1 from pg_roles where rolname = $1', [
  ROLE,
])
// Role DDL can't take bind parameters; the password is hex, so it is safe to inline.
const verb = exists.rowCount ? 'ALTER' : 'CREATE'
await client.query(
  `${verb} ROLE ${ROLE} WITH LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password}'`,
)
await client.end()

const url = new URL(runtime)
url.username = ROLE
url.password = password
const next = url.toString()

const envPath = new URL('../.env', import.meta.url)
const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
const updated = lines.map((line) =>
  line.startsWith('DATABASE_URL=') ? `DATABASE_URL="${next}"` : line,
)
writeFileSync(envPath, updated.join('\n'))

console.log(`${verb === 'CREATE' ? 'Created' : 'Updated'} role ${ROLE}; DATABASE_URL in .env now connects as ${ROLE}.`)
