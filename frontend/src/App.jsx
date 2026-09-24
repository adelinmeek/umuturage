import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import CitizenRegister from './pages/CitizenRegister.jsx'
import OfficerRegister from './pages/OfficerRegister.jsx'
import CitizenDashboard from './pages/CitizenDashboard.jsx'
import OfficerPortal from './pages/OfficerPortal.jsx'
import AdminPortal from './pages/AdminPortal.jsx'
import StatisticsPortal from './pages/StatisticsPortal.jsx'
import NotFound from './pages/NotFound.jsx'
import { useSession, bumpSession } from './lib/useSession.js'
import { bootstrap } from './lib/store.js'

export default function App() {
  const account = useSession()

  // Refresh the role-scoped cache from the API on load (instant UI comes from
  // the localStorage mirror; this reconciles it with the server).
  useEffect(() => {
    let active = true
    bootstrap().then(() => {
      if (active) bumpSession()
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Layout account={account} />}>
        <Route index element={<Home account={account} />} />
        <Route path="login" element={<Login />} />
        <Route path="register/citizen" element={<CitizenRegister />} />
        <Route path="register/officer" element={<OfficerRegister />} />
        <Route path="citizen" element={<CitizenDashboard account={account} />} />
        <Route path="officer" element={<OfficerPortal account={account} />} />
        <Route path="admin" element={<AdminPortal account={account} />} />
        <Route path="statistics" element={<StatisticsPortal account={account} />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
