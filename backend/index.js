import express from 'express'
import cors from 'cors'
import { pathToFileURL } from 'node:url'
import { q, withTransaction, initDb, mapAccount, uid } from './db.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
// Base64 officer photos can be large; allow a generous JSON body.
app.use(express.json({ limit: '8mb' }))

/* ---------------- helpers ---------------- */

function sameCell(a, b) {
  return (
    !!a && !!b &&
    a.province === b.province &&
    a.district === b.district &&
    a.sector === b.sector &&
    a.cell === b.cell
  )
}

function send(res, status, payload) {
  return res.status(status).json(payload)
}

// Express 4 does not catch rejected async handlers; wrap them so errors reach
// the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

async function accountByIdentifier(identifier) {
  const id = String(identifier || '').trim()
  if (!id) return null
  const rows = await q(
    `SELECT * FROM accounts
      WHERE ("nationalId" <> '' AND lower("nationalId") = lower($1))
         OR (username <> '' AND lower(username) = lower($1))
      LIMIT 1`,
    [id],
  )
  return rows[0] || null
}

async function accountByUid(uidValue) {
  const rows = await q('SELECT * FROM accounts WHERE uid = $1', [uidValue])
  return rows[0] || null
}

function tokenFrom(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7).trim() : ''
}

// Reads `Authorization: Bearer <uid>` and attaches the mapped active account.
async function requireAuth(req, res, next) {
  const token = tokenFrom(req)
  const row = token ? await accountByUid(token) : null
  if (!row) return send(res, 401, { error: 'Not authenticated.' })
  if (row.status !== 'active') return send(res, 403, { error: 'Account is not active.' })
  req.user = mapAccount(row)
  next()
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return send(res, 403, { error: 'Forbidden for your role.' })
    }
    next()
  }
}

// Builds `(province=$1 AND district=$2 AND sector=$3 AND cell=$4) OR (...)`
// matching any of the given cells, against flat location columns.
function anyCellFilter(cells, start = 1) {
  const valid = cells.filter((c) => c && c.province && c.district && c.sector && c.cell)
  if (valid.length === 0) return { clause: 'false', params: [] }
  const parts = []
  const params = []
  valid.forEach((c) => {
    const i = start + params.length
    parts.push(`(province=$${i} AND district=$${i + 1} AND sector=$${i + 2} AND cell=$${i + 3})`)
    params.push(c.province, c.district, c.sector, c.cell)
  })
  return { clause: parts.join(' OR '), params }
}

/* ---------------- role-scoped bootstrap ---------------- */

async function buildBootstrap(account) {
  const base = {
    account,
    accounts: [],
    registrations: [],
    deregistrations: [],
    notices: [],
    commanders: [],
  }

  if (account.role === 'statistics') {
    const [accounts, registrations, deregistrations, notices, commanders] = await Promise.all([
      q('SELECT * FROM accounts ORDER BY "createdAt" ASC'),
      q('SELECT * FROM registrations ORDER BY "createdAt" ASC'),
      q('SELECT * FROM deregistrations ORDER BY "createdAt" ASC'),
      q('SELECT * FROM notices ORDER BY "createdAt" DESC'),
      q('SELECT * FROM commanders ORDER BY "createdAt" ASC'),
    ])
    return { ...base, accounts: accounts.map(mapAccount), registrations, deregistrations, notices, commanders }
  }

  if (account.role === 'admin') {
    const accounts = await q('SELECT * FROM accounts ORDER BY "createdAt" ASC')
    return { ...base, accounts: accounts.map(mapAccount) }
  }

  if (account.role === 'officer') {
    const loc = account.location || {}
    const [registrations, deregistrations, notices, commanders] = await Promise.all([
      q(
        'SELECT * FROM registrations WHERE province=$1 AND district=$2 AND sector=$3 AND cell=$4 ORDER BY "createdAt" ASC',
        [loc.province, loc.district, loc.sector, loc.cell],
      ),
      q(
        'SELECT * FROM deregistrations WHERE province=$1 AND district=$2 AND sector=$3 AND cell=$4 ORDER BY "createdAt" ASC',
        [loc.province, loc.district, loc.sector, loc.cell],
      ),
      q('SELECT * FROM notices WHERE "officerUid"=$1 ORDER BY "createdAt" DESC', [account.uid]),
      q('SELECT * FROM commanders WHERE "officerUid"=$1 ORDER BY "createdAt" ASC', [account.uid]),
    ])
    return { ...base, registrations, deregistrations, notices, commanders }
  }

  // citizen — scope to the cells they belong to (current residence + latest relocation).
  const ownRegs = await q(
    'SELECT * FROM registrations WHERE "citizenUid"=$1 ORDER BY "createdAt" ASC',
    [account.uid],
  )
  const latestReg = ownRegs[ownRegs.length - 1]
  const cells = [account.location, latestReg].filter(Boolean)
  const deregs = await q(
    'SELECT * FROM deregistrations WHERE "citizenUid"=$1 ORDER BY "createdAt" ASC',
    [account.uid],
  )

  let officers = []
  let notices = []
  let commanders = []
  if (cells.length) {
    const f = anyCellFilter(cells)
    const [officerRows, noticeRows, commanderRows] = await Promise.all([
      q(`SELECT * FROM accounts WHERE role='officer' AND status='active' AND (${f.clause})`, f.params),
      q(`SELECT * FROM notices WHERE ${f.clause} ORDER BY "createdAt" DESC`, f.params),
      q(`SELECT * FROM commanders WHERE ${f.clause} ORDER BY "createdAt" ASC`, f.params),
    ])
    officers = officerRows.map(mapAccount)
    notices = noticeRows
    commanders = commanderRows
  }

  return { ...base, accounts: officers, registrations: ownRegs, deregistrations: deregs, notices, commanders }
}

/* ---------------- routes ---------------- */

app.get('/api/health', async (_req, res) => {
  try {
    await q('SELECT 1')
    res.json({ ok: true, service: 'umuturage-api', database: 'postgres' })
  } catch {
    res.status(503).json({ ok: false, service: 'umuturage-api', database: 'unreachable' })
  }
})

app.post('/api/auth/login', wrap(async (req, res) => {
  const { identifier, password } = req.body || {}
  const row = await accountByIdentifier(identifier)
  if (!row || row.password !== password) {
    return send(res, 401, { error: 'Invalid credentials.' })
  }
  if (row.status === 'pending') {
    return send(res, 403, { error: 'Your officer registration is awaiting admin confirmation.' })
  }
  if (row.status === 'suspended') {
    return send(res, 403, { error: 'This account is suspended. Contact the administrator.' })
  }
  const account = mapAccount(row)
  const bootstrap = await buildBootstrap(account)
  return res.json({ token: account.uid, account, bootstrap })
}))

app.get('/api/bootstrap', wrap(requireAuth), wrap(async (req, res) => {
  res.json(await buildBootstrap(req.user))
}))

/* ---------------- accounts ---------------- */

// Public for citizen/officer self-registration; admin-only for statistics accounts.
app.post('/api/accounts', wrap(async (req, res) => {
  const body = req.body || {}
  const role = body.role

  if (!['citizen', 'officer', 'statistics'].includes(role)) {
    return send(res, 400, { error: 'Invalid role.' })
  }

  if (role === 'statistics') {
    const actorRow = tokenFrom(req) ? await accountByUid(tokenFrom(req)) : null
    if (!actorRow || actorRow.role !== 'admin' || actorRow.status !== 'active') {
      return send(res, 403, { error: 'Only an administrator can create statistics accounts.' })
    }
    const username = String(body.username || '').trim()
    if (!username) return send(res, 400, { error: 'Username is required.' })
    const dup = await q('SELECT uid FROM accounts WHERE lower(username) = lower($1) LIMIT 1', [username])
    if (dup.length) return send(res, 409, { error: 'That username is already taken.' })
    const record = {
      uid: uid(), role, username,
      names: body.names || '', nationalId: '', phone: '',
      password: body.password || '', photo: '',
      province: null, district: null, sector: null, cell: null, village: null,
      status: 'active', deregCleared: false,
    }
    await insertAccount(record)
    return send(res, 201, { account: mapAccount(record) })
  }

  // citizen / officer public registration
  const nationalId = String(body.nationalId || '').trim()
  const dup = await q('SELECT uid FROM accounts WHERE "nationalId" <> \'\' AND lower("nationalId") = lower($1) LIMIT 1', [nationalId])
  if (dup.length) return send(res, 409, { error: 'An account with this National ID already exists.' })
  if (role === 'officer' && !body.photo) {
    return send(res, 400, { error: 'A photo is required for cell officer registration.' })
  }
  const loc = body.location || {}
  const record = {
    uid: uid(), role, username: '',
    names: body.names || '', nationalId,
    phone: String(body.phone || '').trim(),
    password: body.password || '',
    photo: body.photo || '',
    province: loc.province || null, district: loc.district || null, sector: loc.sector || null,
    cell: loc.cell || null, village: loc.village || null,
    status: role === 'officer' ? 'pending' : 'active',
    deregCleared: false,
  }
  await insertAccount(record)
  return send(res, 201, { account: mapAccount(record) })
}))

async function insertAccount(a) {
  await q(
    `INSERT INTO accounts
       (uid, role, username, names, "nationalId", phone, password, photo,
        province, district, sector, cell, village, status, "deregCleared")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [a.uid, a.role, a.username, a.names, a.nationalId, a.phone, a.password, a.photo,
     a.province, a.district, a.sector, a.cell, a.village, a.status, a.deregCleared],
  )
}

app.patch('/api/accounts/:uid', wrap(requireAuth), requireRole('admin'), wrap(async (req, res) => {
  const existing = await accountByUid(req.params.uid)
  if (!existing) return send(res, 404, { error: 'Account not found.' })
  const { names, phone, status } = req.body || {}
  const fields = []
  const params = []
  if (names !== undefined) { params.push(names); fields.push(`names=$${params.length}`) }
  if (phone !== undefined) { params.push(phone); fields.push(`phone=$${params.length}`) }
  if (status !== undefined) { params.push(status); fields.push(`status=$${params.length}`) }
  if (!fields.length) return res.json({ account: mapAccount(existing) })
  params.push(existing.uid)
  const rows = await q(
    `UPDATE accounts SET ${fields.join(', ')} WHERE uid=$${params.length} RETURNING *`,
    params,
  )
  return res.json({ account: mapAccount(rows[0]) })
}))

app.delete('/api/accounts/:uid', wrap(requireAuth), requireRole('admin'), wrap(async (req, res) => {
  const existing = await accountByUid(req.params.uid)
  if (!existing) return send(res, 404, { error: 'Account not found.' })
  if (existing.role === 'admin') return send(res, 403, { error: 'Administrator accounts cannot be deleted.' })
  await q('DELETE FROM accounts WHERE uid=$1', [existing.uid])
  return res.json({ ok: true })
}))

/* ---------------- relocation registrations ---------------- */

app.post('/api/registrations', wrap(requireAuth), requireRole('citizen'), wrap(async (req, res) => {
  const citizen = req.user
  if (!citizen.deregCleared) {
    return send(res, 403, { error: 'An approved de-registration is required before registering a relocation.' })
  }
  const loc = req.body || {}
  const record = {
    uid: uid(),
    citizenUid: citizen.uid,
    nationalId: citizen.nationalId,
    names: citizen.names,
    phone: citizen.phone,
    province: loc.province, district: loc.district, sector: loc.sector, cell: loc.cell, village: loc.village,
    status: 'pending',
  }
  await withTransaction(async (c) => {
    await c.query(
      `INSERT INTO registrations
         (uid, "citizenUid", "nationalId", names, phone, province, district, sector, cell, village, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')`,
      [record.uid, record.citizenUid, record.nationalId, record.names, record.phone,
       record.province, record.district, record.sector, record.cell, record.village],
    )
    await c.query('UPDATE accounts SET "deregCleared"=false WHERE uid=$1', [citizen.uid])
  })
  const rows = await q('SELECT * FROM registrations WHERE uid=$1', [record.uid])
  return send(res, 201, { registration: rows[0] })
}))

app.patch('/api/registrations/:uid/status', wrap(requireAuth), requireRole('officer'), wrap(async (req, res) => {
  const rows = await q('SELECT * FROM registrations WHERE uid=$1', [req.params.uid])
  const reg = rows[0]
  if (!reg) return send(res, 404, { error: 'Registration not found.' })
  if (!sameCell(reg, req.user.location)) return send(res, 403, { error: 'Outside your cell.' })
  const { status } = req.body || {}
  if (!['approved', 'rejected'].includes(status)) return send(res, 400, { error: 'Invalid status.' })
  await withTransaction(async (c) => {
    await c.query(
      'UPDATE registrations SET status=$1, "decidedBy"=$2, "decidedAt"=now() WHERE uid=$3',
      [status, req.user.nationalId, reg.uid],
    )
    if (status === 'approved') {
      await c.query(
        'UPDATE accounts SET province=$1, district=$2, sector=$3, cell=$4, village=$5 WHERE uid=$6',
        [reg.province, reg.district, reg.sector, reg.cell, reg.village, reg.citizenUid],
      )
    }
  })
  const updated = await q('SELECT * FROM registrations WHERE uid=$1', [reg.uid])
  return res.json({ registration: updated[0] })
}))

/* ---------------- de-registrations ---------------- */

app.post('/api/deregistrations', wrap(requireAuth), requireRole('citizen'), wrap(async (req, res) => {
  const citizen = req.user
  const pending = await q(
    'SELECT uid FROM deregistrations WHERE "citizenUid"=$1 AND status=\'pending\' LIMIT 1',
    [citizen.uid],
  )
  if (pending.length) return send(res, 409, { error: 'You already have a pending de-registration request.' })
  const loc = citizen.location || {}
  const newUid = uid()
  await q(
    `INSERT INTO deregistrations
       (uid, "citizenUid", "nationalId", names, province, district, sector, cell, village, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')`,
    [newUid, citizen.uid, citizen.nationalId, citizen.names,
     loc.province || null, loc.district || null, loc.sector || null, loc.cell || null, loc.village || null],
  )
  const rows = await q('SELECT * FROM deregistrations WHERE uid=$1', [newUid])
  return send(res, 201, { deregistration: rows[0] })
}))

app.patch('/api/deregistrations/:uid/status', wrap(requireAuth), requireRole('officer'), wrap(async (req, res) => {
  const rows = await q('SELECT * FROM deregistrations WHERE uid=$1', [req.params.uid])
  const dereg = rows[0]
  if (!dereg) return send(res, 404, { error: 'De-registration not found.' })
  if (!sameCell(dereg, req.user.location)) return send(res, 403, { error: 'Outside your cell.' })
  const { status } = req.body || {}
  if (!['approved', 'rejected'].includes(status)) return send(res, 400, { error: 'Invalid status.' })
  await withTransaction(async (c) => {
    await c.query(
      'UPDATE deregistrations SET status=$1, "decidedBy"=$2, "decidedAt"=now() WHERE uid=$3',
      [status, req.user.nationalId, dereg.uid],
    )
    if (status === 'approved') {
      await c.query('UPDATE accounts SET "deregCleared"=true WHERE uid=$1', [dereg.citizenUid])
    }
  })
  const updated = await q('SELECT * FROM deregistrations WHERE uid=$1', [dereg.uid])
  return res.json({ deregistration: updated[0] })
}))

/* ---------------- notices ---------------- */

app.post('/api/notices', wrap(requireAuth), requireRole('officer'), wrap(async (req, res) => {
  const officer = req.user
  const { title, body } = req.body || {}
  if (!title || !body) return send(res, 400, { error: 'Both a title and a message are required.' })
  const loc = officer.location || {}
  const newUid = uid()
  await q(
    `INSERT INTO notices
       (uid, province, district, sector, cell, village, "officerUid", "officerNames", title, body)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [newUid, loc.province || null, loc.district || null, loc.sector || null, loc.cell || null, loc.village || null,
     officer.uid, officer.names, String(title).trim(), String(body).trim()],
  )
  const rows = await q('SELECT * FROM notices WHERE uid=$1', [newUid])
  return send(res, 201, { notice: rows[0] })
}))

app.delete('/api/notices/:uid', wrap(requireAuth), wrap(async (req, res) => {
  const rows = await q('SELECT * FROM notices WHERE uid=$1', [req.params.uid])
  const notice = rows[0]
  if (!notice) return send(res, 404, { error: 'Notice not found.' })
  if (req.user.role !== 'admin' && notice.officerUid !== req.user.uid) {
    return send(res, 403, { error: 'You can only delete your own notices.' })
  }
  await q('DELETE FROM notices WHERE uid=$1', [notice.uid])
  return res.json({ ok: true })
}))

/* ---------------- cell commander contacts ---------------- */

app.post('/api/commanders', wrap(requireAuth), requireRole('officer'), wrap(async (req, res) => {
  const officer = req.user
  const { names, position, phone } = req.body || {}
  if (!names) return send(res, 400, { error: 'Commander names are required.' })
  const loc = officer.location || {}
  const newUid = uid()
  await q(
    `INSERT INTO commanders
       (uid, province, district, sector, cell, village, "officerUid", "officerNames", names, position, phone)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [newUid, loc.province || null, loc.district || null, loc.sector || null, loc.cell || null, loc.village || null,
     officer.uid, officer.names, String(names).trim(), String(position || 'Cell Commander').trim(), String(phone || '').trim()],
  )
  const rows = await q('SELECT * FROM commanders WHERE uid=$1', [newUid])
  return send(res, 201, { commander: rows[0] })
}))

app.delete('/api/commanders/:uid', wrap(requireAuth), wrap(async (req, res) => {
  const rows = await q('SELECT * FROM commanders WHERE uid=$1', [req.params.uid])
  const commander = rows[0]
  if (!commander) return send(res, 404, { error: 'Commander contact not found.' })
  if (req.user.role !== 'admin' && commander.officerUid !== req.user.uid) {
    return send(res, 403, { error: 'You can only remove your own commander contacts.' })
  }
  await q('DELETE FROM commanders WHERE uid=$1', [commander.uid])
  return res.json({ ok: true })
}))

/* ---------------- error handling & startup ---------------- */

app.use((err, _req, res, _next) => {
  console.error('[api] unhandled error:', err)
  if (res.headersSent) return
  res.status(500).json({ error: 'Server error.' })
})

export { app }

// Only bind the port when this file is the entrypoint (not when imported, e.g. by tests).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[umuturage-api] listening on http://localhost:${PORT}`)
      })
    })
    .catch((err) => {
      console.error('[umuturage-api] failed to initialise database:', err.message)
      process.exit(1)
    })
}
