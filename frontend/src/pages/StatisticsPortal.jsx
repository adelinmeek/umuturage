import { Navigate } from 'react-router-dom'
import {
  computeStats,
  getAccounts,
  getCommanders,
  getDeregistrations,
  getNotices,
  getRegistrations,
} from '../lib/store.js'

function locShort(loc) {
  if (!loc) return '—'
  return `${loc.village || ''} ${loc.cell || ''}, ${loc.sector || ''}, ${loc.district || ''}`.trim() || '—'
}

const date = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—')

function StatTile({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function BarRow({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
      <span className="bar-value">{value}</span>
    </div>
  )
}

function DataTable({ title, headers, rows }) {
  return (
    <article className="card dash-card dash-card-wide">
      <h3>{title} ({rows.length})</h3>
      <div className="table-wrap">
        <table className="accounts-table">
          <thead>
            <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={headers.length} className="muted">No records.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  )
}

function StatisticsPortalInner() {
  const s = computeStats()
  const accounts = getAccounts()
  const regs = getRegistrations()
  const deregs = getDeregistrations()
  const notices = getNotices()
  const commanders = getCommanders()

  const provinceEntries = Object.entries(s.byProvince).sort((a, b) => b[1] - a[1])
  const provinceMax = provinceEntries.length ? provinceEntries[0][1] : 0

  const citizenProvinceEntries = Object.entries(s.citizensByProvince).sort((a, b) => b[1] - a[1])
  const citizenProvinceMax = citizenProvinceEntries.length ? citizenProvinceEntries[0][1] : 0

  return (
    <section className="section page-section">
      <div className="container">
        <span className="eyebrow">Statistics</span>
        <h1 className="page-title">System statistics</h1>
        <p className="page-sub">Read-only overview of every record in the system.</p>

        <div className="stats-grid stats-grid-many">
          <StatTile label="Citizens" value={s.citizens} />
          <StatTile label="Active officers" value={s.officersActive} />
          <StatTile label="Officers pending" value={s.officersPending} />
          <StatTile label="Statistics accounts" value={s.statisticsAccounts} />
          <StatTile label="Relocations" value={s.relocations.total} />
          <StatTile label="De-registrations" value={s.deregistrations.total} />
          <StatTile label="Notices" value={s.notices} />
          <StatTile label="Commander contacts" value={commanders.length} />
        </div>

        <div className="dash-grid">
          <article className="card dash-card">
            <h3>Relocations by status</h3>
            <BarRow label="Pending" value={s.relocations.pending} max={s.relocations.total} />
            <BarRow label="Approved" value={s.relocations.approved} max={s.relocations.total} />
            <BarRow label="Rejected" value={s.relocations.rejected} max={s.relocations.total} />
          </article>

          <article className="card dash-card">
            <h3>De-registrations by status</h3>
            <BarRow label="Pending" value={s.deregistrations.pending} max={s.deregistrations.total} />
            <BarRow label="Approved" value={s.deregistrations.approved} max={s.deregistrations.total} />
            <BarRow label="Rejected" value={s.deregistrations.rejected} max={s.deregistrations.total} />
          </article>

          <article className="card dash-card dash-card-wide">
            <h3>Relocations by province</h3>
            {provinceEntries.length === 0 ? (
              <p className="muted small">No relocations recorded yet.</p>
            ) : (
              provinceEntries.map(([province, count]) => (
                <BarRow key={province} label={province} value={count} max={provinceMax} />
              ))
            )}
          </article>

          <article className="card dash-card dash-card-wide">
            <h3>Citizen allocation by province</h3>
            {citizenProvinceEntries.length === 0 ? (
              <p className="muted small">No citizens registered yet.</p>
            ) : (
              citizenProvinceEntries.map(([province, count]) => (
                <BarRow key={province} label={province} value={count} max={citizenProvinceMax} />
              ))
            )}
          </article>

          <DataTable
            title="Citizen distribution by location"
            headers={['Province', 'District', 'Sector', 'Cell', 'Village', 'Citizens']}
            rows={s.distribution.map((d) => [d.province, d.district, d.sector, d.cell, d.village, d.citizens])}
          />

          <DataTable
            title="Accounts"
            headers={['Role', 'Names', 'ID / username', 'Phone', 'Cell', 'Status']}
            rows={accounts.map((a) => [a.role, a.names, a.nationalId || a.username, a.phone || '—', locShort(a.location), a.status])}
          />

          <DataTable
            title="Relocations"
            headers={['Names', 'National ID', 'Phone', 'New residence', 'Status', 'Submitted', 'Decided']}
            rows={regs.map((r) => [r.names, r.nationalId, r.phone, locShort(r), r.status, date(r.createdAt), date(r.decidedAt)])}
          />

          <DataTable
            title="De-registrations"
            headers={['Names', 'National ID', 'Cell', 'Status', 'Requested', 'Decided']}
            rows={deregs.map((d) => [d.names, d.nationalId, locShort(d), d.status, date(d.createdAt), date(d.decidedAt)])}
          />

          <DataTable
            title="Notices"
            headers={['Title', 'Message', 'Officer', 'Cell', 'Sent']}
            rows={notices.map((n) => [n.title, n.body, n.officerNames, locShort(n), date(n.createdAt)])}
          />

          <DataTable
            title="Cell commander contacts"
            headers={['Names', 'Position', 'Phone', 'Cell', 'Added by', 'Created']}
            rows={commanders.map((c) => [c.names, c.position, c.phone, locShort(c), c.officerNames, date(c.createdAt)])}
          />
        </div>
      </div>
    </section>
  )
}

export default function StatisticsPortal({ account }) {
  if (!account || account.role !== 'statistics') return <Navigate to="/login" replace />
  return <StatisticsPortalInner />
}
