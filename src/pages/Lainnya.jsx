import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { bisaMengajukan, bisaApprove } from '../lib/roles'
import {
  IconHome,
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconLock,
  IconBell,
  IconChevronRight,
} from '../lib/icons'

// Menu "Lainnya" menampilkan seluruh fitur yang biasa ada di aplikasi HRIS,
// bukan cuma yang sudah dibangun di MVP ini. Item yang belum dibangun sengaja
// ditampilkan sebagai referensi cakupan produk ke depan, tapi dikunci
// (non-klik) supaya tidak menyesatkan pengguna mengira fiturnya sudah ada.
function Tile({ icon, label, caption, onClick, disabled }) {
  return (
    <div
      className={`menu-tile${disabled ? ' disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      {disabled && (
        <span className="menu-tile-lock">
          <IconLock />
        </span>
      )}
      <div className="menu-tile-icon">{icon}</div>
      <div>
        <div className="menu-tile-label">{label}</div>
        {caption && <div className="menu-tile-caption">{caption}</div>}
      </div>
    </div>
  )
}

export default function Lainnya() {
  const navigate = useNavigate()
  const { role } = useAuth()

  return (
    <div className="page">
      <h1>Lainnya</h1>

      <div className="menu-section-title">Akses Cepat</div>
      <div className="menu-section-subtitle">Fitur yang sudah tersedia</div>
      <div className="menu-grid" style={{ marginBottom: '1.5rem' }}>
        <Tile icon={<IconHome />} label="Kehadiran" caption="Absen & riwayat" onClick={() => navigate('/absen')} />
        {bisaMengajukan(role) && (
          <Tile
            icon={<IconCalendar />}
            label="Cuti / Lembur"
            caption="Ajukan & status"
            onClick={() => navigate('/pengajuan')}
          />
        )}
        {bisaApprove(role) && (
          <Tile
            icon={<IconCheckCircle />}
            label="Approval"
            caption="Setujui pengajuan"
            onClick={() => navigate('/approval')}
          />
        )}
        <Tile icon={<IconClock />} label="WFH/WFA" caption="Belum tersedia" disabled />
      </div>

      <div className="menu-section-title">SDM</div>
      <div className="menu-section-subtitle">Belum tersedia di versi ini</div>
      <div className="menu-grid" style={{ marginBottom: '1.5rem' }}>
        <Tile icon={<IconCalendar />} label="Hari Libur" caption="Daftar libur" disabled />
        <Tile icon={<IconHome />} label="Tim" caption="Daftar & struktur" disabled />
        <Tile icon={<IconLock />} label="Kartu ID" caption="ID karyawan" disabled />
      </div>

      <div className="menu-section-title">Keuangan</div>
      <div className="menu-section-subtitle">Belum tersedia di versi ini</div>
      <div className="menu-grid" style={{ marginBottom: '1.5rem' }}>
        <Tile icon={<IconClock />} label="Reimburse" caption="Klaim biaya" disabled />
        <Tile icon={<IconClock />} label="Kasbon" caption="Pengajuan utang" disabled />
        <Tile icon={<IconClock />} label="Slip Gaji" caption="Unduh PDF" disabled />
      </div>

      <div className="menu-section-title">Informasi</div>
      <div className="menu-section-subtitle">Belum tersedia di versi ini</div>
      <div className="menu-grid">
        <Tile icon={<IconBell />} label="Pengumuman" caption="Info lembaga" disabled />
        <Tile icon={<IconLock />} label="Kebijakan" caption="Aturan & SOP" disabled />
        <Tile icon={<IconChevronRight />} label="Pengaturan" caption="Akun & profil" disabled />
      </div>
    </div>
  )
}
