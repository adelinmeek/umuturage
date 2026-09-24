// Postgres data layer for the Umuturage-MIS API.
// Account location is stored as flat, indexed columns (province/district/sector/
// cell/village) so cell-scoped queries are plain SQL — no JSON operators needed.

import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'node:crypto'

const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL

// Render's managed Postgres requires SSL; local dev usually does not.
// Toggle with DATABASE_SSL=true.
export let pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 10,
    })
  : null

// Test seam: allows swapping in an alternate pg-compatible pool.
export function __setPool(p) {
  pool = p
}

export const uid = () => randomUUID()

export async function q(text, params = []) {
  const res = await pool.query(text, params)
  return res.rows
}

export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Shapes an accounts row into the object the frontend expects:
// password removed, flat location columns folded into a `location` object.
export function mapAccount(row) {
  if (!row) return row
  const { password, province, district, sector, cell, village, ...rest } = row
  const hasLoc = province || district || sector || cell || village
  return {
    ...rest,
    location: hasLoc ? { province, district, sector, cell, village } : null,
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  uid text PRIMARY KEY,
  role text NOT NULL,
  username text NOT NULL DEFAULT '',
  names text NOT NULL DEFAULT '',
  "nationalId" text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  photo text NOT NULL DEFAULT '',
  province text,
  district text,
  sector text,
  cell text,
  village text,
  status text NOT NULL DEFAULT 'active',
  "deregCleared" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS registrations (
  uid text PRIMARY KEY,
  "citizenUid" text NOT NULL,
  "nationalId" text NOT NULL DEFAULT '',
  names text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  province text, district text, sector text, cell text, village text,
  status text NOT NULL DEFAULT 'pending',
  "decidedBy" text,
  "decidedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS deregistrations (
  uid text PRIMARY KEY,
  "citizenUid" text NOT NULL,
  "nationalId" text NOT NULL DEFAULT '',
  names text NOT NULL DEFAULT '',
  province text, district text, sector text, cell text, village text,
  status text NOT NULL DEFAULT 'pending',
  "decidedBy" text,
  "decidedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notices (
  uid text PRIMARY KEY,
  province text, district text, sector text, cell text, village text,
  "officerUid" text NOT NULL,
  "officerNames" text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commanders (
  uid text PRIMARY KEY,
  province text, district text, sector text, cell text, village text,
  "officerUid" text NOT NULL,
  "officerNames" text NOT NULL DEFAULT '',
  names text NOT NULL DEFAULT '',
  position text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_accounts_cell ON accounts (province, district, sector, cell);
CREATE INDEX IF NOT EXISTS idx_reg_citizen ON registrations ("citizenUid");
CREATE INDEX IF NOT EXISTS idx_reg_cell ON registrations (province, district, sector, cell);
CREATE INDEX IF NOT EXISTS idx_dereg_citizen ON deregistrations ("citizenUid");
CREATE INDEX IF NOT EXISTS idx_dereg_cell ON deregistrations (province, district, sector, cell);
CREATE INDEX IF NOT EXISTS idx_notices_officer ON notices ("officerUid");
CREATE INDEX IF NOT EXISTS idx_notices_cell ON notices (province, district, sector, cell);
CREATE INDEX IF NOT EXISTS idx_commanders_officer ON commanders ("officerUid");
CREATE INDEX IF NOT EXISTS idx_commanders_cell ON commanders (province, district, sector, cell);
`

export async function initDb() {
  if (!pool) {
    throw new Error(
      'DATABASE_URL is not set. Create a server/.env file pointing at a Postgres database (see server/.env.example).',
    )
  }
  await pool.query(SCHEMA)
  const admins = await q(`SELECT uid FROM accounts WHERE role = 'admin' LIMIT 1`)
  if (admins.length === 0) {
    await q(
      `INSERT INTO accounts
         (uid, role, username, names, "nationalId", phone, password, photo, status, "deregCleared")
       VALUES ($1, 'admin', 'admin', 'System Administrator', '', '', 'admin123', '', 'active', false)`,
      ['admin-root'],
    )
    console.log('[db] seeded administrator account (admin / admin123)')
  }
  console.log('[db] Postgres schema ready')
}
