import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { logout } from '../lib/store.js'
import { bumpSession } from '../lib/useSession.js'
import { ROLE_HOME, ROLE_LABEL } from '../lib/roles.js'

function linksFor(account) {
  if (!account) {
    return [
      { to: '/', label: 'Home', end: true },
      { to: '/register/citizen', label: 'Citizen account' },
      { to: '/register/officer', label: 'Officer registration' },
      { to: '/login', label: 'Sign in' },
    ]
  }
  return [
    { to: '/', label: 'Home', end: true },
    { to: ROLE_HOME[account.role], label: `${ROLE_LABEL[account.role]} dashboard` },
  ]
}

export default function Navbar({ account }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const links = linksFor(account)

  const handleLogout = () => {
    logout()
    bumpSession()
    setOpen(false)
    navigate('/')
  }

  return (
    <header className="navbar">
      <div className="nav-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden="true" />
          Umuturage-MIS
        </Link>

        <button
          className="nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav-links ${open ? 'is-open' : ''}`}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          {account && (
            <button className="btn btn-ghost btn-sm nav-logout" onClick={handleLogout}>
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
