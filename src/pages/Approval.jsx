import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { bisaApprove, STATUS_LABEL } from '../lib/roles'
import RoleGuard from '../components/RoleGuard'
import { formatTanggalWIB } from '../lib/waktu'

export default function Approval() {
  const { user, role } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('pengajuan')
      .select('*, pemohon:pengajuan_user_id_fkey(nama, role)')
      .in('status', ['pending_approval1', 'pending_approval2'])
      .or(`approver1_id.eq.${user.id},approver2_id.eq.${user.id}`)
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    setItems(data ?? [])
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    if (bisaApprove(role)) load()
    else setLoading(false)
  }, [load, role])

  async function putuskan(row, keputusan) {
    setBusyId(row.id)
    setError('')
    const isApprover1 = row.status === 'pending_approval1' && row.approver1_id === user.id
    const field = isApprover1 ? 'approver1_status' : 'approver2_status'

    const { error } = await supabase
      .from('pengajuan')
      .update({ [field]: keputusan })
      .eq('id', row.id)

    if (!error) {
      await supabase.from('log').insert({
        user_id: user.id,
        action: 'approval_pengajuan',
        detail: { pengajuan_id: row.id, keputusan, tahap: isApprover1 ? 1 : 2 },
      })
    }

    setBusyId(null)
    if (error) {
      setError(error.message)
    } else {
      load()
    }
  }

  return (
    <RoleGuard allowed={bisaApprove(role)}>
      <div className="page">
        <h1>Approval Pengajuan</h1>
        {error && (
          <div className="card">
            <p className="form-error">{error}</p>
          </div>
        )}
        {loading ? (
          <p className="muted">Memuat...</p>
        ) : items.length === 0 ? (
          <div className="card">
            <p className="muted">Tidak ada pengajuan menunggu persetujuan Anda.</p>
          </div>
        ) : (
          items.map((row) => (
            <div className="card" key={row.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <div>
                  <div className="card-title">{row.pemohon?.nama}</div>
                  <div className="card-subtitle" style={{ textTransform: 'capitalize' }}>
                    {row.pemohon?.role} · {row.jenis}
                    {row.jenis === 'lembur' ? ` · ${row.jam_lembur} jam` : ''}
                  </div>
                </div>
                <span className={`badge badge-${row.status}`}>{STATUS_LABEL[row.status]}</span>
              </div>
              <p className="muted" style={{ margin: '0.3rem 0' }}>
                {formatTanggalWIB(row.tanggal_mulai)} - {formatTanggalWIB(row.tanggal_selesai)}
              </p>
              <p style={{ margin: '0.3rem 0 1rem', fontSize: '0.9rem' }}>{row.alasan}</p>
              <div className="btn-row">
                <button onClick={() => putuskan(row, 'approved')} disabled={busyId === row.id}>
                  Approve
                </button>
                <button
                  onClick={() => putuskan(row, 'rejected')}
                  disabled={busyId === row.id}
                  className="btn-danger"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </RoleGuard>
  )
}
