import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { bisaMengajukan, STATUS_LABEL } from '../lib/roles'
import RoleGuard from '../components/RoleGuard'
import { formatTanggalWIB } from '../lib/waktu'

const KOSONG = {
  jenis: 'cuti',
  tanggal_mulai: '',
  tanggal_selesai: '',
  jam_lembur: '',
  alasan: '',
}

export default function Pengajuan() {
  const { user, role } = useAuth()
  const [form, setForm] = useState(KOSONG)
  const [riwayat, setRiwayat] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pengajuan')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setRiwayat(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (bisaMengajukan(role)) load()
    else setLoading(false)
  }, [load, role])

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)

    const payload = {
      user_id: user.id,
      jenis: form.jenis,
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai,
      jam_lembur: form.jenis === 'lembur' ? Number(form.jam_lembur) : null,
      alasan: form.alasan,
    }

    const { error } = await supabase.from('pengajuan').insert(payload)
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    await supabase
      .from('log')
      .insert({ user_id: user.id, action: 'ajukan_pengajuan', detail: payload })
    setInfo('Pengajuan berhasil dikirim.')
    setForm(KOSONG)
    load()
  }

  return (
    <RoleGuard allowed={bisaMengajukan(role)}>
      <div className="page">
        <h1>Pengajuan Cuti / Lembur</h1>
        <form className="card form-grid" onSubmit={handleSubmit}>
          <label>
            Jenis
            <select value={form.jenis} onChange={(e) => updateField('jenis', e.target.value)}>
              <option value="cuti">Cuti</option>
              <option value="lembur">Lembur</option>
            </select>
          </label>
          <label>
            Tanggal Mulai
            <input
              type="date"
              required
              value={form.tanggal_mulai}
              onChange={(e) => updateField('tanggal_mulai', e.target.value)}
            />
          </label>
          <label>
            Tanggal Selesai
            <input
              type="date"
              required
              value={form.tanggal_selesai}
              onChange={(e) => updateField('tanggal_selesai', e.target.value)}
            />
          </label>
          {form.jenis === 'lembur' && (
            <label>
              Jam Lembur
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={form.jam_lembur}
                onChange={(e) => updateField('jam_lembur', e.target.value)}
              />
            </label>
          )}
          <label className="full-width">
            Alasan
            <textarea
              required
              value={form.alasan}
              onChange={(e) => updateField('alasan', e.target.value)}
            />
          </label>
          {error && <p className="form-error full-width">{error}</p>}
          {info && <p className="form-info full-width">{info}</p>}
          <button type="submit" disabled={submitting} className="full-width">
            {submitting ? 'Mengirim...' : 'Ajukan'}
          </button>
        </form>

        <h2>Riwayat Pengajuan</h2>
        <div className="card">
          {loading ? (
            <p className="muted">Memuat...</p>
          ) : riwayat.length === 0 ? (
            <p className="muted">Belum ada pengajuan.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Jenis</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((row) => (
                  <tr key={row.id}>
                    <td>{row.jenis}</td>
                    <td>
                      {formatTanggalWIB(row.tanggal_mulai)} - {formatTanggalWIB(row.tanggal_selesai)}
                    </td>
                    <td>
                      <span className={`badge badge-${row.status}`}>
                        {STATUS_LABEL[row.status]}
                      </span>
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
