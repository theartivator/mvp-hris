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

function Stepper({ status, punyaApprover2 }) {
  const tahap = ['Diajukan', punyaApprover2 ? 'Approval 1' : 'Approval', punyaApprover2 ? 'Approval 2' : null].filter(Boolean)
  const rejected = status === 'rejected'
  let doneUpTo = 0
  if (status === 'pending_approval1') doneUpTo = 0
  else if (status === 'pending_approval2') doneUpTo = 1
  else if (status === 'approved') doneUpTo = tahap.length - 1
  else if (rejected) doneUpTo = 0

  const dots = []
  tahap.forEach((_, i) => {
    if (i > 0) {
      dots.push(<div key={`line-${i}`} className={`stepper-line${i <= doneUpTo ? ' done' : ''}`} />)
    }
    dots.push(
      <div
        key={`dot-${i}`}
        className={`stepper-dot${rejected && i === doneUpTo ? ' rejected' : i <= doneUpTo ? ' done' : ''}`}
      />
    )
  })

  return (
    <div>
      <div className="stepper">{dots}</div>
      <div className="stepper-labels">
        {tahap.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  )
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
        <h1>Ajukan Cuti / Lembur</h1>
        <form className="card" onSubmit={handleSubmit}>
          <label className="muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>
            Jenis
          </label>
          <div className="pill-group" style={{ marginBottom: '1rem' }}>
            <div
              className={`pill-option${form.jenis === 'cuti' ? ' selected' : ''}`}
              onClick={() => updateField('jenis', 'cuti')}
            >
              Cuti
            </div>
            <div
              className={`pill-option${form.jenis === 'lembur' ? ' selected' : ''}`}
              onClick={() => updateField('jenis', 'lembur')}
            >
              Lembur
            </div>
          </div>

          <div className="form-grid">
            <label>
              Mulai
              <input
                type="date"
                required
                value={form.tanggal_mulai}
                onChange={(e) => updateField('tanggal_mulai', e.target.value)}
              />
            </label>
            <label>
              Selesai
              <input
                type="date"
                required
                value={form.tanggal_selesai}
                onChange={(e) => updateField('tanggal_selesai', e.target.value)}
              />
            </label>
            {form.jenis === 'lembur' && (
              <label className="full-width">
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
                rows={3}
                placeholder="Contoh: Keperluan keluarga di luar kota."
                value={form.alasan}
                onChange={(e) => updateField('alasan', e.target.value)}
              />
            </label>
          </div>

          {error && <p className="form-error" style={{ marginTop: '0.8rem' }}>{error}</p>}
          {info && <p className="form-info" style={{ marginTop: '0.8rem' }}>{info}</p>}
          <button type="submit" disabled={submitting} style={{ width: '100%', marginTop: '1.2rem' }}>
            {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </form>

        <h2>Status Pengajuan Saya</h2>
        {loading ? (
          <p className="muted">Memuat...</p>
        ) : riwayat.length === 0 ? (
          <div className="card">
            <p className="muted">Belum ada pengajuan.</p>
          </div>
        ) : (
          riwayat.map((row) => (
            <div className="card" key={row.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                <div>
                  <div className="card-title" style={{ textTransform: 'capitalize' }}>
                    {row.jenis}
                    {row.jenis === 'lembur' ? ` · ${row.jam_lembur} jam` : ''}
                  </div>
                  <div className="card-subtitle">
                    {formatTanggalWIB(row.tanggal_mulai)} - {formatTanggalWIB(row.tanggal_selesai)}
                  </div>
                </div>
                <span className={`badge badge-${row.status}`}>{STATUS_LABEL[row.status]}</span>
              </div>
              <Stepper status={row.status} punyaApprover2={!!row.approver2_id} />
            </div>
          ))
        )}
      </div>
    </RoleGuard>
  )
}
