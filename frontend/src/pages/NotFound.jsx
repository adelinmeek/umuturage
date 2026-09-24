import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="section page-section">
      <div className="container center">
        <span className="notfound-code">404</span>
        <h1 className="page-title">This page could not be found</h1>
        <p className="page-sub">The link may be broken or the page may have moved.</p>
        <div className="section-cta">
          <Link to="/" className="btn btn-primary">Back home</Link>
        </div>
      </div>
    </section>
  )
}
