import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  addCommander,
  addNotice,
  deleteCommander,
  deleteNotice,
  getCommanders,
  getDeregistrations,
  getNotices,
  getRegistrations,
  isPhoneValid,
  sameCellLoc,
  setDeregistrationStatus,
  setRegistrationStatus,
} from '../lib/store.js'

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

function formatLoc(loc) {
  if (!loc) return '—'
  return `${loc.village}, ${loc.cell}, ${loc.sector}, ${loc.district}`
}

function OfficerPortalInner({ officer }) {
  const [, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [noticeError, setNoticeError] = useState('')

  const [cmdNames, setCmdNames] = useState('')
  const [cmdPosition, setCmdPosition] = useState('')
  const [cmdPhone, setCmdPhone] = useState('')
  const [cmdError, setCmdError] = useState('')

  const pendingDeregs = getDeregistrations().filter((d) => d.status === 'pending' && sameCellLoc(d, officer.location))
  const pendingRegs = getRegistrations().filter((r) => r.status === 'pending' && sameCellLoc(r, officer.location))
  const myNotices = getNotices().filter((n) => n.officerUid === officer.uid)
  const myCommanders = getCommanders().filter((c) => c.officerUid === officer.uid)

  const [actionError, setActionError] = useState('')

  const decideDereg = async (uid, status) => {
    setActionError('')
    try { await setDeregistrationStatus(uid, status); refresh() } catch (err) { setActionError(err.message) }
  }
  const decideReg = async (uid, status) => {
    setActionError('')
    try { await setRegistrationStatus(uid, status); refresh() } catch (err) { setActionError(err.message) }
  }

  const sendNotice = async (e) => {
    e.preventDefault()
    setNoticeError('')
    if (!title.trim() || !body.trim()) { setNoticeError('Both a title and a message are required.'); return }
    try {
      await addNotice({ title: title.trim(), body: body.trim() })
      setTitle('')
      setBody('')
      refresh()
    } catch (err) {
      setNoticeError(err.message)
    }
  }

  const addCommanderContact = async (e) => {
    e.preventDefault()
    setCmdError('')
    if (!cmdNames.trim()) return setCmdError('Commander names are required.')
    if (!isPhoneValid(cmdPhone)) return setCmdError('Phone number must be a Rwandan number, e.g. 0788123456.')
    try {
      await addCommander({
        names: cmdNames.trim(),
        position: cmdPosition.trim() || 'Cell Commander',
        phone: cmdPhone.trim(),
      })
      setCmdNames('')
      setCmdPosition('')
      setCmdPhone('')
      refresh()
    } catch (err) {
      setCmdError(err.message)
    }
  }

  const removeNotice = async (uid) => {
    setActionError('')
    try { await deleteNotice(uid); refresh() } catch (err) { setActionError(err.message) }
  }
  const removeCommander = async (uid) => {
    setActionError('')
    try { await deleteCommander(uid); refresh() } catch (err) { setActionError(err.message) }
  }

  return (
    <section className="section page-section">
      <div className="container">
        <span className="eyebrow">Cell officer</span>
        <h1 className="page-title">Welcome, {officer.names}</h1>
        <p className="page-sub">Serving {formatLoc(officer.location)}, {officer.location.province}.</p>

        {actionError && <p className="form-error" role="alert">{actionError}</p>}

        <div className="dash-grid">
          <article className="card dash-card">
            <h3>De-registration requests ({pendingDeregs.length})</h3>
            {pendingDeregs.length === 0 ? (
              <p className="muted small">No pending de-registration requests.</p>
            ) : (
              pendingDeregs.map((d) => (
                <div key={d.uid} className="queue-item">
                  <strong>{d.names}</strong>
                  <p className="muted small">{d.nationalId} · {formatLoc(d)}</p>
                  <div className="reg-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => decideDereg(d.uid, 'approved')}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => decideDereg(d.uid, 'rejected')}>Reject</button>
                  </div>
                </div>
              ))
            )}
          </article>

          <article className="card dash-card">
            <h3>Relocation approvals ({pendingRegs.length})</h3>
            {pendingRegs.length === 0 ? (
              <p className="muted small">No pending relocations.</p>
            ) : (
              pendingRegs.map((r) => (
                <div key={r.uid} className="queue-item">
                  <strong>{r.names}</strong>
                  <p className="muted small">{r.nationalId} · {r.phone}</p>
                  <p className="muted small">Moving to {formatLoc(r)}</p>
                  <div className="reg-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => decideReg(r.uid, 'approved')}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => decideReg(r.uid, 'rejected')}>Reject</button>
                  </div>
                </div>
              ))
            )}
          </article>

          <article className="card dash-card">
            <h3>Send a notice to your cell</h3>
            <form className="stack-form" onSubmit={sendNotice} noValidate>
              <label className="form-field">
                <span>Title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Community meeting" required />
              </label>
              <label className="form-field">
                <span>Message</span>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Information for citizens in your cell" required />
              </label>
              {noticeError && <p className="form-error" role="alert">{noticeError}</p>}
              <button type="submit" className="btn btn-primary btn-sm">Send notice</button>
            </form>
          </article>

          <article className="card dash-card">
            <h3>My notices ({myNotices.length})</h3>
            {myNotices.length === 0 ? (
              <p className="muted small">You have not sent any notices.</p>
            ) : (
              <ul className="notice-list">
                {myNotices.map((n) => (
                  <li key={n.uid}>
                    <strong>{n.title}</strong>
                    <p>{n.body}</p>
                    <span className="muted small">{new Date(n.createdAt).toLocaleDateString()}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeNotice(n.uid)}>Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card dash-card">
            <h3>Cell commander contacts ({myCommanders.length})</h3>
            <form className="stack-form" onSubmit={addCommanderContact} noValidate>
              <label className="form-field">
                <span>Full names</span>
                <input value={cmdNames} onChange={(e) => setCmdNames(e.target.value)} placeholder="e.g. Sgt. Mugisha Eric" required />
              </label>
              <div className="form-row">
                <label className="form-field">
                  <span>Position</span>
                  <input value={cmdPosition} onChange={(e) => setCmdPosition(e.target.value)} placeholder="Cell Commander" />
                </label>
                <label className="form-field">
                  <span>Phone</span>
                  <input value={cmdPhone} onChange={(e) => setCmdPhone(e.target.value)} inputMode="tel" placeholder="0788123456" required />
                </label>
              </div>
              {cmdError && <p className="form-error" role="alert">{cmdError}</p>}
              <button type="submit" className="btn btn-primary btn-sm">Add commander contact</button>
            </form>
            {myCommanders.length > 0 && (
              <ul className="notice-list">
                {myCommanders.map((c) => (
                  <li key={c.uid}>
                    <strong>{c.names}</strong>
                    <p className="muted small">{c.position} · {c.phone}</p>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeCommander(c.uid)}>Remove</button>
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

export default function OfficerPortal({ account }) {
  if (!account || account.role !== 'officer') return <Navigate to="/login" replace />
  return <OfficerPortalInner officer={account} />
}
