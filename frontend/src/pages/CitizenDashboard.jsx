import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import LocationFields from '../components/LocationFields.jsx'
import { EMPTY_LOCATION } from '../data/rwanda.js'
import {
  addDeregistration,
  addRegistration,
  getCommandersByCell,
  getDeregistrationsByCitizen,
  getNotices,
  getOfficersByCell,
  getRegistrationsByCitizen,
  sameCellLoc,
} from '../lib/store.js'
import { bumpSession } from '../lib/useSession.js'

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

function formatLoc(loc) {
  if (!loc) return '—'
  return `${loc.village}, ${loc.cell}, ${loc.sector}, ${loc.district}, ${loc.province}`
}

export default function CitizenDashboard({ account }) {
  if (!account || account.role !== 'citizen') return <Navigate to="/login" replace />
  return <CitizenDashboardInner account={account} />
}

function CitizenDashboardInner({ account }) {
  const [, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)

  const [newLoc, setNewLoc] = useState({ ...EMPTY_LOCATION })
  const [relocError, setRelocError] = useState('')
  const [deregError, setDeregError] = useState('')
  const [busy, setBusy] = useState(false)

  const deregs = getDeregistrationsByCitizen(account.uid)
  const latestDereg = deregs[deregs.length - 1]
  const regs = getRegistrationsByCitizen(account.uid)
  const latestReg = regs[regs.length - 1]
  const officer = latestReg ? getOfficersByCell(latestReg)[0] : null
  const commanders = getCommandersByCell(account.location)
  const notices = getNotices().filter(
    (n) => sameCellLoc(n, account.location) || (latestReg && sameCellLoc(n, latestReg)),
  )

  const requestDeregistration = async () => {
    setDeregError('')
    setBusy(true)
    try {
      await addDeregistration()
      bumpSession()
      refresh()
    } catch (err) {
      setDeregError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submitRelocation = async (e) => {
    e.preventDefault()
    setRelocError('')
    if (!newLoc.province || !newLoc.district || !newLoc.sector || !newLoc.cell || !newLoc.village) {
      setRelocError('Complete all residence fields.')
      return
    }
    setBusy(true)
    try {
      await addRegistration({ ...newLoc })
      setNewLoc({ ...EMPTY_LOCATION })
      bumpSession()
      refresh()
    } catch (err) {
      setRelocError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section page-section">
      <div className="container">
        <span className="eyebrow">Citizen dashboard</span>
        <h1 className="page-title">Welcome, {account.names}</h1>
        <p className="page-sub">Current residence: {formatLoc(account.location)}</p>

        <div className="dash-grid">
          <article className="card dash-card">
            <h3>De-registration</h3>
            <p className="muted small">
              You must request and receive an approved de-registration from your current cell officer
              before registering a relocation.
            </p>
            {latestDereg ? (
              <>
                <p className="badge-line">Latest request: <StatusBadge status={latestDereg.status} /></p>
                {latestDereg.status === 'pending' && <p className="muted small">Awaiting your cell officer's decision.</p>}
                {latestDereg.status === 'rejected' && (
                  <button className="btn btn-ghost btn-sm" onClick={requestDeregistration} disabled={busy}>Request again</button>
                )}
              </>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={requestDeregistration} disabled={busy}>Request de-registration</button>
            )}
            {deregError && <p className="form-error" role="alert">{deregError}</p>}
            {account.deregCleared && <p className="muted small cleared-note">De-registration approved — you may register a relocation.</p>}
          </article>

          <article className="card dash-card">
            <h3>Register relocation</h3>
            {!account.deregCleared ? (
              <p className="muted small">
                Locked until your de-registration is approved by your cell officer.
              </p>
            ) : (
              <form className="stack-form" onSubmit={submitRelocation} noValidate>
                <LocationFields value={newLoc} onChange={setNewLoc} legend="New residence" />
                {relocError && <p className="form-error" role="alert">{relocError}</p>}
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Submitting…' : 'Submit relocation'}</button>
              </form>
            )}
            {latestReg && (
              <p className="badge-line">Latest relocation: <StatusBadge status={latestReg.status} /> <span className="muted small">{formatLoc(latestReg)}</span></p>
            )}
          </article>

          <article className="card dash-card">
            <h3>Your cell officer</h3>
            {!latestReg ? (
              <p className="muted small">Register a relocation to see your cell officer's contact details.</p>
            ) : officer ? (
              <div className="officer-card">
                {officer.photo ? (
                  <img className="officer-photo" src={officer.photo} alt={officer.names} />
                ) : (
                  <div className="photo-placeholder" aria-hidden="true" />
                )}
                <div>
                  <strong>{officer.names}</strong>
                  <p className="muted small">{officer.phone}</p>
                  <p className="muted small">{formatLoc(officer.location)}</p>
                </div>
              </div>
            ) : (
              <p className="muted small">No active officer is registered for that cell yet.</p>
            )}
          </article>

          <article className="card dash-card">
            <h3>Cell commander contacts</h3>
            {commanders.length === 0 ? (
              <p className="muted small">No commander contacts published for your cell yet.</p>
            ) : (
              <ul className="notice-list">
                {commanders.map((c) => (
                  <li key={c.uid}>
                    <strong>{c.names}</strong>
                    <p className="muted small">{c.position} · {c.phone}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card dash-card">
            <h3>Notices from your cell</h3>
            {notices.length === 0 ? (
              <p className="muted small">No notices yet.</p>
            ) : (
              <ul className="notice-list">
                {notices.map((n) => (
                  <li key={n.uid}>
                    <strong>{n.title}</strong>
                    <p>{n.body}</p>
                    <span className="muted small">{n.officerNames} · {new Date(n.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </div>
    </section>
  )
}
