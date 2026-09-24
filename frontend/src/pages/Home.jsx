import { Link } from 'react-router-dom'
import { ROLE_HOME } from '../lib/roles.js'

const steps = [
  { title: 'Create an account', body: 'Citizens and cell officers each register an account. Officers add a photo and wait for admin confirmation.' },
  { title: 'Request de-registration', body: 'Before relocating, a citizen requests de-registration and their current cell officer approves it.' },
  { title: 'Register the relocation', body: 'Once cleared, the citizen registers the new residence; the new cell officer approves it.' },
  { title: 'Stay informed', body: 'Citizens see their cell officer\'s contact details and photo, plus notices sent to their cell.' },
]

export default function Home({ account }) {
  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container hero-content">
          <span className="eyebrow">Republic of Rwanda · Citizen services</span>
          <h1 className="hero-title">
            Umuturage-<span className="gradient-text">MIS</span>
          </h1>
          <p className="hero-sub">
            The management information system for citizen relocation. Register an account, get
            de-registered by your cell officer, and record your new residence — with officer
            approval at every step.
          </p>
          <div className="hero-actions">
            {account ? (
              <Link to={ROLE_HOME[account.role]} className="btn btn-primary">Go to my dashboard</Link>
            ) : (
              <>
                <Link to="/register/citizen" className="btn btn-primary">Create citizen account</Link>
                <Link to="/login" className="btn btn-ghost">Sign in</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">How it works</h2>
          <div className="card-grid card-grid-four">
            {steps.map((s, i) => (
              <article key={s.title} className="card">
                <span className="step-num" aria-hidden="true">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container">
          <h2 className="section-title">Choose your role</h2>
          <div className="card-grid card-grid-two">
            <article className="card card-cta">
              <h3>I am a citizen</h3>
              <p>Create an account, request de-registration when you move, then register your new residence.</p>
              <div className="success-actions">
                <Link to="/register/citizen" className="btn btn-primary">Create account</Link>
                <Link to="/login" className="btn btn-ghost">Sign in</Link>
              </div>
            </article>
            <article className="card card-cta">
              <h3>I am a cell officer</h3>
              <p>Register with your photo and cell. Once the admin confirms you, approve citizens and send notices.</p>
              <div className="success-actions">
                <Link to="/register/officer" className="btn btn-primary">Register as officer</Link>
                <Link to="/login" className="btn btn-ghost">Sign in</Link>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  )
}
