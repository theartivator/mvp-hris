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
        <div className="card">
          {loading ? (
            <p className="muted">Memuat...</p>
          ) : error ? (
            <p className="form-error">{error}</p>
          ) : items.length === 0 ? (
            <p className="muted">Tidak ada pengajuan menunggu persetujuan Anda.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Pemohon</th>
                  <th>Jenis</th>
                  <th>Tanggal</th>
                  <th>Alasan</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.pemohon?.nama} <span className="muted">({row.pemohon?.role})</span>
                    </td>
                    <td>
                      {row.jenis}
                      {row.jenis === 'lembur' ? ` (${row.jam_lembur} jam)` : ''}
                    </td>
                    <td>
                      {formatTanggalWIB(row.tanggal_mulai)} - {formatTanggalWIB(row.tanggal_selesai)}
                    </td>
                    <td>{row.alasan}</td>
                    <td>
                      <span className={`badge badge-${row.status}`}>{STATUS_LABEL[row.status]}</span>
                    </td>
                    <td className="btn-row">
                      <button
                        onClick={() => putuskan(row, 'approved')}
                        disabled={busyId === row.id}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => putuskan(row, 'rejected')}
                        disabled={busyId === row.id}
                        className="btn-danger"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
