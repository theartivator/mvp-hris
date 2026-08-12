import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { bisaMengajukan, STATUS_LABEL } from '../lib/roles'
import RoleGuard from '../components/RoleGuard'
import { formatTanggalWIB } from '../lib/waktu'

const CUTI_KOSONG = {
  tanggal_mulai: '',
  tanggal_selesai: '',
  alasan: '',
}

const LEMBUR_KOSONG = {
  tanggal: '',
  jam_mulai: '',
  jam_selesai: '',
  keterangan: '',
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
  const [tab, setTab] = useState('cuti')
  const [cutiForm, setCutiForm] = useState(CUTI_KOSONG)
  const [lemburForm, setLemburForm] = useState(LEMBUR_KOSONG)
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

  function updateCuti(field, value) {
    setCutiForm((f) => ({ ...f, [field]: value }))
  }

  function updateLembur(field, value) {
    setLemburForm((f) => ({ ...f, [field]: value }))
  }

  function switchTab(t) {
    setTab(t)
    setError('')
    setInfo('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)

    const payload =
      tab === 'cuti'
        ? {
            user_id: user.id,
            jenis: 'cuti',
            tanggal_mulai: cutiForm.tanggal_mulai,
            tanggal_selesai: cutiForm.tanggal_selesai,
            alasan: cutiForm.alasan,
          }
        : {
            user_id: user.id,
            jenis: 'lembur',
            tanggal_mulai: lemburForm.tanggal,
            tanggal_selesai: lemburForm.tanggal,
            jam_mulai: lemburForm.jam_mulai,
            jam_selesai: lemburForm.jam_selesai,
            alasan: lemburForm.keterangan || null,
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
    if (tab === 'cuti') setCutiForm(CUTI_KOSONG)
    else setLemburForm(LEMBUR_KOSONG)
    load()
  }

  return (
    <RoleGuard allowed={bisaMengajukan(role)}>
      <div className="page">
        <h1>Ajukan Cuti / Lembur</h1>

        <div className="pill-group" style={{ marginBottom: '1rem' }}>
          <div
            className={`pill-option${tab === 'cuti' ? ' selected' : ''}`}
            onClick={() => switchTab('cuti')}
          >
            Cuti
          </div>
          <div
            className={`pill-option${tab === 'lembur' ? ' selected' : ''}`}
            onClick={() => switchTab('lembur')}
          >
            Lembur
          </div>
        </div>

        {tab === 'cuti' ? (
          <form className="card" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Mulai
                <input
                  type="date"
                  required
                  value={cutiForm.tanggal_mulai}
                  onChange={(e) => updateCuti('tanggal_mulai', e.target.value)}
                />
              </label>
              <label>
                Selesai
                <input
                  type="date"
                  required
                  value={cutiForm.tanggal_selesai}
                  onChange={(e) => updateCuti('tanggal_selesai', e.target.value)}
                />
              </label>
              <label className="full-width">
                Alasan
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Keperluan keluarga di luar kota."
                  value={cutiForm.alasan}
                  onChange={(e) => updateCuti('alasan', e.target.value)}
                />
              </label>
            </div>

            {error && <p className="form-error" style={{ marginTop: '0.8rem' }}>{error}</p>}
            {info && <p className="form-info" style={{ marginTop: '0.8rem' }}>{info}</p>}
            <button type="submit" disabled={submitting} style={{ width: '100%', marginTop: '1.2rem' }}>
              {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            </button>
          </form>
        ) : (
          <form className="card" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="full-width">
                Tanggal
                <input
                  type="date"
                  required
                  value={lemburForm.tanggal}
                  onChange={(e) => updateLembur('tanggal', e.target.value)}
                />
              </label>
              <label>
                Jam Mulai
                <input
                  type="time"
                  required
                  value={lemburForm.jam_mulai}
                  onChange={(e) => updateLembur('jam_mulai', e.target.value)}
                />
              </label>
              <label>
                Jam Selesai
                <input
                  type="time"
                  required
                  value={lemburForm.jam_selesai}
                  onChange={(e) => updateLembur('jam_selesai', e.target.value)}
                />
              </label>
              <label className="full-width">
                Keterangan
                <textarea
                  rows={3}
                  placeholder="Opsional"
                  value={lemburForm.keterangan}
                  onChange={(e) => updateLembur('keterangan', e.target.value)}
                />
              </label>
            </div>

            {error && <p className="form-error" style={{ marginTop: '0.8rem' }}>{error}</p>}
            {info && <p className="form-info" style={{ marginTop: '0.8rem' }}>{info}</p>}
            <button type="submit" disabled={submitting} style={{ width: '100%', marginTop: '1.2rem' }}>
              {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            </button>
          </form>
        )}

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
                    {row.jenis === 'lembur' ? ` · ${row.jam_mulai?.slice(0, 5)}-${row.jam_selesai?.slice(0, 5)}` : ''}
                  </div>
                  <div className="card-subtitle">
                    {row.jenis === 'lembur'
                      ? formatTanggalWIB(row.tanggal_mulai)
                      : `${formatTanggalWIB(row.tanggal_mulai)} - ${formatTanggalWIB(row.tanggal_selesai)}`}
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
