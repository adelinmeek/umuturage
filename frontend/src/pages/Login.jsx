import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../lib/store.js'
import { bumpSession } from '../lib/useSession.js'
import { ROLE_HOME } from '../lib/roles.js'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await login(identifier, password)
      if (result.error) {
        setError(result.error)
        return
      }
      bumpSession()
      navigate(ROLE_HOME[result.account.role] || '/')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section page-section">
      <div className="container narrow">
        <span className="eyebrow">Sign in</span>
        <h1 className="page-title">Log in to Umuturage-MIS</h1>
        <p className="page-sub">
          Citizens and cell officers sign in with their National ID. Administrators and statistics
          accounts sign in with their username.
        </p>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <label className="form-field">
            <span>National ID or username</span>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="16-digit ID or username" required />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>

        <div className="auth-alt">
          <Link to="/register/citizen">Create a citizen account</Link>
          <span aria-hidden="true">·</span>
          <Link to="/register/officer">Register as a cell officer</Link>
        </div>
        <p className="muted small demo-hint">
          Demo administrator: username <code>admin</code>, password <code>admin123</code>.
        </p>
      </div>
    </section>
  )
}
