import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { bisaMengajukan, bisaApprove } from '../lib/roles'
import { IconHome, IconCalendar, IconCheckCircle, IconGrid } from '../lib/icons'

function initials(nama) {
  if (!nama) return '?'
  return nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export default function Layout() {
  const { profile, role, signOut } = useAuth()

  return (
    <div className="app-shell">
      <div className="app-banner">Absensi &amp; Cuti/Lembur</div>
      <header className="app-header">
        <div className="app-header-greeting">
          <div className="app-header-avatar">{initials(profile?.nama)}</div>
          <div>
            <div className="app-header-name">Hi, {profile?.nama ?? '...'}</div>
            <div className="app-header-role">{role ?? '-'}</div>
          </div>
        </div>
        <button onClick={signOut} className="btn-link">
          Keluar
        </button>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="app-tabbar">
        <div className="app-tabbar-inner">
          <NavLink to="/absen" className={({ isActive }) => `app-tab${isActive ? ' active' : ''}`}>
            <IconHome />
            Beranda
          </NavLink>
          {bisaMengajukan(role) && (
            <NavLink
              to="/pengajuan"
              className={({ isActive }) => `app-tab${isActive ? ' active' : ''}`}
            >
              <IconCalendar />
              Pengajuan
            </NavLink>
          )}
          {bisaApprove(role) && (
            <NavLink
              to="/approval"
              className={({ isActive }) => `app-tab${isActive ? ' active' : ''}`}
            >
              <IconCheckCircle />
              Approval
            </NavLink>
          )}
          <NavLink to="/lainnya" className={({ isActive }) => `app-tab${isActive ? ' active' : ''}`}>
            <IconGrid />
            Lainnya
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
