import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'

export default function Layout({ account }) {
  return (
    <div className="app-shell">
      <Navbar account={account} />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
