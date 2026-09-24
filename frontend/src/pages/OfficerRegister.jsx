import { useState } from 'react'
import { Link } from 'react-router-dom'
import LocationFields from '../components/LocationFields.jsx'
import PhotoInput from '../components/PhotoInput.jsx'
import { EMPTY_LOCATION } from '../data/rwanda.js'
import { createAccount, isNationalIdValid, isPhoneValid, isLocationComplete } from '../lib/store.js'

const initial = { names: '', nationalId: '', phone: '', password: '', confirm: '', ...EMPTY_LOCATION }

export default function OfficerRegister() {
  const [form, setForm] = useState(initial)
  const [photo, setPhoto] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.names.trim()) return setError('Full names are required.')
    if (!isNationalIdValid(form.nationalId)) return setError('National ID must be exactly 16 digits.')
    if (!isPhoneValid(form.phone)) return setError('Phone number must be a Rwandan number, e.g. 0788123456.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    if (!photo) return setError('A photo is required for cell officer registration.')
    if (!isLocationComplete(form)) return setError('Complete all location fields for the cell you serve.')

    setBusy(true)
    try {
      await createAccount({
        role: 'officer',
        names: form.names.trim(),
        nationalId: form.nationalId,
        phone: form.phone,
        password: form.password,
        photo,
        location: { province: form.province, district: form.district, sector: form.sector, cell: form.cell, village: form.village },
      })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <section className="section page-section">
        <div className="container narrow">
          <div className="contact-success" role="status">
            <h3>Registration submitted</h3>
            <p>
              Your cell officer registration is awaiting confirmation by the administrator. You will
              be able to sign in once it is confirmed.
            </p>
            <div className="success-actions">
              <Link to="/login" className="btn btn-primary">Go to sign in</Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section page-section">
      <div className="container narrow">
        <span className="eyebrow">Cell officer</span>
        <h1 className="page-title">Cell officer registration</h1>
        <p className="page-sub">
          Register with the cell you serve and a photo. The administrator must confirm your
          registration before you can sign in and approve citizens.
        </p>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <label className="form-field">
              <span>Full names</span>
              <input value={form.names} onChange={set('names')} placeholder="e.g. Habimana Jean" required />
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

          <PhotoInput value={photo} onChange={setPhoto} label="Officer photo (required)" />

          <LocationFields value={form} onChange={(loc) => setForm((f) => ({ ...f, ...loc }))} legend="Cell you serve" />

          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit for confirmation'}</button>
        </form>

        <div className="auth-alt">
          <Link to="/login">Already confirmed? Sign in</Link>
        </div>
      </div>
    </section>
  )
}
