import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import LocationFields from '../components/LocationFields.jsx'
import { EMPTY_LOCATION } from '../data/rwanda.js'
import { createAccount, isNationalIdValid, isPhoneValid, isLocationComplete, login } from '../lib/store.js'
import { bumpSession } from '../lib/useSession.js'

const initial = { names: '', nationalId: '', phone: '', password: '', confirm: '', ...EMPTY_LOCATION }

export default function CitizenRegister() {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.names.trim()) return setError('Full names are required.')
    if (!isNationalIdValid(form.nationalId)) return setError('National ID must be exactly 16 digits.')
    if (!isPhoneValid(form.phone)) return setError('Phone number must be a Rwandan number, e.g. 0788123456.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    if (!isLocationComplete(form)) return setError('Complete all current-residence location fields.')

    setBusy(true)
    try {
      await createAccount({
        role: 'citizen',
        names: form.names.trim(),
        nationalId: form.nationalId,
        phone: form.phone,
        password: form.password,
        location: { province: form.province, district: form.district, sector: form.sector, cell: form.cell, village: form.village },
      })
      const result = await login(form.nationalId, form.password)
      if (result.error) return setError(result.error)
      bumpSession()
      navigate('/citizen')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section page-section">
      <div className="container narrow">
        <span className="eyebrow">Citizen</span>
        <h1 className="page-title">Create your citizen account</h1>
        <p className="page-sub">
          Register once with your current residence. You will need an approved de-registration from
          your cell officer before registering a relocation.
        </p>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <label className="form-field">
              <span>Full names</span>
              <input value={form.names} onChange={set('names')} placeholder="e.g. Uwase Aline" required />
            </label>
            <label className="form-field">
              <span>National ID</span>
              <input value={form.nationalId} onChange={set('nationalId')} inputMode="numeric" maxLength={16} placeholder="16 digits" required />
            </label>
          </div>
          <div className="form-row">
            <label className="form-field">
              <span>Phone number</span>
              <input value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="0788123456" required />
            </label>
            <label className="form-field">
              <span>Password</span>
              <input type="password" value={form.password} onChange={set('password')} placeholder="At least 6 characters" required />
            </label>
          </div>
          <label className="form-field">
            <span>Confirm password</span>
            <input type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" required />
          </label>

          <LocationFields value={form} onChange={(loc) => setForm((f) => ({ ...f, ...loc }))} legend="Current residence" />

          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>

        <div className="auth-alt">
          <Link to="/login">Already have an account? Sign in</Link>
        </div>
      </div>
    </section>
  )
}
