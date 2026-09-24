import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>Umuturage-MIS</span>
          <p className="footer-tag">Citizen relocation registration & approval.</p>
        </div>
        <nav className="footer-links">
          <Link to="/register/citizen">Citizen account</Link>
          <Link to="/register/officer">Officer registration</Link>
          <Link to="/login">Sign in</Link>
        </nav>
        <p className="footer-copy">© {new Date().getFullYear()} Umuturage-MIS. Republic of Rwanda.</p>
      </div>
    </footer>
  )
}
