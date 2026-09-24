import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  createAccount,
  deleteAccount,
  getAccounts,
  updateAccount,
} from '../lib/store.js'

function formatLoc(loc) {
  if (!loc) return '—'
  return `${loc.cell}, ${loc.sector}, ${loc.district}`
}

function AdminPortalInner() {
  const [, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)

  const [editingUid, setEditingUid] = useState(null)
  const [draft, setDraft] = useState(null)
  const [statForm, setStatForm] = useState({ username: '', names: '', password: '' })
  const [statError, setStatError] = useState('')

  const accounts = getAccounts()
  const pendingOfficers = accounts.filter((a) => a.role === 'officer' && a.status === 'pending')
  const [actionError, setActionError] = useState('')

  const run = async (fn) => {
    setActionError('')
    try { await fn(); refresh() } catch (err) { setActionError(err.message) }
  }

  const startEdit = (a) => {
    setEditingUid(a.uid)
    setDraft({ names: a.names, phone: a.phone, status: a.status })
  }

  const saveEdit = (uid) =>
    run(() => updateAccount(uid, { names: draft.names, phone: draft.phone, status: draft.status }))
      .then(() => setEditingUid(null))

  const confirmOfficer = (uid) => run(() => updateAccount(uid, { status: 'active' }))
  const removeAccount = (uid) => run(() => deleteAccount(uid))

  const createStatistics = async (e) => {
    e.preventDefault()
    setStatError('')
    if (!statForm.username.trim()) return setStatError('Username is required.')
    if (!statForm.names.trim()) return setStatError('Names are required.')
    if (statForm.password.length < 6) return setStatError('Password must be at least 6 characters.')
    if (accounts.some((a) => a.username && a.username.toLowerCase() === statForm.username.trim().toLowerCase())) {
      return setStatError('That username is already taken.')
    }
    try {
      await createAccount({ role: 'statistics', username: statForm.username.trim(), names: statForm.names.trim(), password: statForm.password })
      setStatForm({ username: '', names: '', password: '' })
      refresh()
    } catch (err) {
      setStatError(err.message)
    }
  }

  return (
    <section className="section page-section">
      <div className="container">
        <span className="eyebrow">Administrator</span>
        <h1 className="page-title">Administration</h1>
        <p className="page-sub">Confirm cell officers, manage every account, and create statistics accounts.</p>

        {actionError && <p className="form-error" role="alert">{actionError}</p>}

        <div className="dash-grid">
          <article className="card dash-card">
            <h3>Officer confirmations ({pendingOfficers.length})</h3>
            {pendingOfficers.length === 0 ? (
              <p className="muted small">No officer registrations awaiting confirmation.</p>
            ) : (
              pendingOfficers.map((o) => (
                <div key={o.uid} className="queue-item">
                  <div className="queue-head">
                    {o.photo ? <img className="officer-photo sm" src={o.photo} alt={o.names} /> : <div className="photo-placeholder sm" aria-hidden="true" />}
                    <div>
                      <strong>{o.names}</strong>
                      <p className="muted small">{o.nationalId} · {o.phone}</p>
                      <p className="muted small">{formatLoc(o.location)}</p>
                    </div>
                  </div>
                  <div className="reg-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => confirmOfficer(o.uid)}>Confirm</button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeAccount(o.uid)}>Decline</button>
                  </div>
                </div>
              ))
            )}
          </article>

          <article className="card dash-card">
            <h3>Create statistics account</h3>
            <form className="stack-form" onSubmit={createStatistics} noValidate>
              <label className="form-field"><span>Username</span>
                <input value={statForm.username} onChange={(e) => setStatForm((f) => ({ ...f, username: e.target.value }))} placeholder="e.g. stats" required />
              </label>
              <label className="form-field"><span>Full names</span>
                <input value={statForm.names} onChange={(e) => setStatForm((f) => ({ ...f, names: e.target.value }))} placeholder="e.g. NISR Analyst" required />
              </label>
              <label className="form-field"><span>Password</span>
                <input type="password" value={statForm.password} onChange={(e) => setStatForm((f) => ({ ...f, password: e.target.value }))} placeholder="At least 6 characters" required />
              </label>
              {statError && <p className="form-error" role="alert">{statError}</p>}
              <button type="submit" className="btn btn-primary btn-sm">Create account</button>
            </form>
          </article>

          <article className="card dash-card dash-card-wide">
            <h3>All accounts ({accounts.length})</h3>
            <div className="table-wrap">
              <table className="accounts-table">
                <thead>
                  <tr><th>Role</th><th>Names</th><th>ID / username</th><th>Phone</th><th>Cell</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.uid}>
                      {editingUid === a.uid ? (
                        <>
                          <td>{a.role}</td>
                          <td><input className="cell-input" value={draft.names} onChange={(e) => setDraft((d) => ({ ...d, names: e.target.value }))} /></td>
                          <td>{a.nationalId || a.username}</td>
                          <td><input className="cell-input" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} /></td>
                          <td>{formatLoc(a.location)}</td>
                          <td>
                            <select className="cell-input" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                              <option value="active">active</option>
                              <option value="pending">pending</option>
                              <option value="suspended">suspended</option>
                            </select>
                          </td>
                          <td className="row-actions">
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(a.uid)}>Save</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingUid(null)}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{a.role}</td>
                          <td>{a.names}</td>
                          <td>{a.nationalId || a.username}</td>
                          <td>{a.phone || '—'}</td>
                          <td>{formatLoc(a.location)}</td>
                          <td><span className={`badge badge-${a.status === 'active' ? 'approved' : a.status === 'pending' ? 'pending' : 'rejected'}`}>{a.status}</span></td>
                          <td className="row-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(a)}>Edit</button>
                            {a.role !== 'admin' && (
                              <button className="btn btn-danger btn-sm" onClick={() => removeAccount(a.uid)}>Delete</button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export default function AdminPortal({ account }) {
  if (!account || account.role !== 'admin') return <Navigate to="/login" replace />
  return <AdminPortalInner />
}
