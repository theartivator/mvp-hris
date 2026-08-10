import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { bisaMengajukan, bisaApprove } from '../lib/roles'

export default function Layout() {
  const { profile, role, signOut } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">Absensi</div>
        <nav className="app-nav">
          <NavLink to="/absen" className={({ isActive }) => (isActive ? 'active' : '')}>
            Absen
          </NavLink>
          {bisaMengajukan(role) && (
            <NavLink to="/pengajuan" className={({ isActive }) => (isActive ? 'active' : '')}>
              Pengajuan
            </NavLink>
          )}
          {bisaApprove(role) && (
            <NavLink to="/approval" className={({ isActive }) => (isActive ? 'active' : '')}>
              Approval
            </NavLink>
          )}
        </nav>
        <div className="app-user">
          <span>
            {profile?.nama ?? '...'} <em>({role ?? '-'})</em>
          </span>
          <button onClick={signOut} className="btn-link">
            Keluar
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
