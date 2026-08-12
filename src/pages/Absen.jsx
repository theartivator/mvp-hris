import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { tanggalWIB, formatTanggalWIB, formatJamWIB } from '../lib/waktu'
import { IconFingerprint, IconCheckCircle } from '../lib/icons'

function timeHHMM(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Absen() {
  const { user } = useAuth()
  const [today, setToday] = useState(null)
  const [riwayat, setRiwayat] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editMasuk, setEditMasuk] = useState('')
  const [editKeluar, setEditKeluar] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const tgl = tanggalWIB()

    const [{ data: todayRow, error: todayErr }, { data: history, error: historyErr }] =
      await Promise.all([
        supabase.from('absensi').select('*').eq('tanggal', tgl).maybeSingle(),
        supabase
          .from('absensi')
          .select('*')
          .order('tanggal', { ascending: false })
          .limit(30),
      ])

    if (todayErr) setError(todayErr.message)
    if (historyErr) setError(historyErr.message)
    setToday(todayRow ?? null)
    setRiwayat(history ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCircleTap() {
    if (busy) return
    setBusy(true)
    setError('')
    const now = new Date().toISOString()

    if (!today) {
      const { error } = await supabase
        .from('absensi')
        .insert({ user_id: user.id, tanggal: tanggalWIB(), jam_masuk: now })
      if (!error) {
        await supabase
          .from('log')
          .insert({ user_id: user.id, action: 'absen_masuk', detail: { tanggal: tanggalWIB() } })
      }
      if (error) setError(error.message)
    } else if (!today.jam_keluar) {
      const { error } = await supabase
        .from('absensi')
        .update({ jam_keluar: now })
        .eq('id', today.id)
      if (!error) {
        await supabase
          .from('log')
          .insert({ user_id: user.id, action: 'absen_keluar', detail: { tanggal: tanggalWIB() } })
      }
      if (error) setError(error.message)
    }

    setBusy(false)
    await load()
  }

  function openEdit() {
    setEditMasuk(timeHHMM(today?.jam_masuk))
    setEditKeluar(timeHHMM(today?.jam_keluar))
    setEditing(true)
    setError('')
  }

  async function saveEdit() {
    if (!today || !editMasuk) return
    setSavingEdit(true)
    setError('')
    const tgl = tanggalWIB()
    const jamMasuk = `${tgl}T${editMasuk}:00+07:00`
    const jamKeluar = editKeluar ? `${tgl}T${editKeluar}:00+07:00` : null

    const { error } = await supabase
      .from('absensi')
      .update({ jam_masuk: jamMasuk, jam_keluar: jamKeluar })
      .eq('id', today.id)

    if (!error) {
      await supabase.from('log').insert({
        user_id: user.id,
        action: 'edit_absen',
        detail: { tanggal: tgl, jam_masuk: jamMasuk, jam_keluar: jamKeluar },
      })
    }

    setSavingEdit(false)
    if (error) {
      setError(error.message)
    } else {
      setEditing(false)
      await load()
    }
  }

  const selesai = !!today?.jam_keluar
  const label = !today ? 'Absen Masuk' : selesai ? 'Selesai Hari Ini' : 'Absen Keluar'

  if (loading) return <div className="page-loading">Memuat...</div>

  return (
    <div className="page">
      <div className="card">
        <div className="card-row-title">
          <div className="card-icon">
            <IconFingerprint />
          </div>
          <div>
            <div className="card-title">Kehadiran</div>
            <div className="card-subtitle">{formatTanggalWIB(tanggalWIB())}</div>
          </div>
        </div>

        <div className="absen-circle-wrap">
          <button
            onClick={handleCircleTap}
            disabled={busy || selesai}
            style={{ padding: 0, borderRadius: '50%', background: 'transparent' }}
          >
            <div className="absen-circle">
              {selesai ? <IconCheckCircle /> : <IconFingerprint />}
            </div>
          </button>
        </div>

        <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>
          {label}
        </p>

        <div className="absen-times">
          <div className="absen-time-box">
            <span className="label">Masuk</span>
            <span className="value">{formatJamWIB(today?.jam_masuk)}</span>
            {today?.masuk_di_luar_jam && (
              <span className="badge badge-pending_approval1" style={{ marginTop: '0.3rem' }}>
                Di luar jam normal
              </span>
            )}
          </div>
          <div className="absen-time-box">
            <span className="label">Keluar</span>
            <span className="value">{formatJamWIB(today?.jam_keluar)}</span>
            {today?.keluar_di_luar_jam && (
              <span className="badge badge-pending_approval1" style={{ marginTop: '0.3rem' }}>
                Di luar jam normal
              </span>
            )}
          </div>
        </div>

        {today && !editing && (
          <button
            type="button"
            className="btn-outline"
            onClick={openEdit}
            style={{ width: '100%', marginTop: '0.8rem' }}
          >
            Edit Waktu
          </button>
        )}

        {editing && (
          <div style={{ marginTop: '0.8rem' }}>
            <div className="form-grid">
              <label>
                Masuk
                <input
                  type="time"
                  required
                  value={editMasuk}
                  onChange={(e) => setEditMasuk(e.target.value)}
                />
              </label>
              <label>
                Keluar
                <input
                  type="time"
                  value={editKeluar}
                  onChange={(e) => setEditKeluar(e.target.value)}
                />
              </label>
            </div>
            <div className="btn-row" style={{ marginTop: '0.8rem' }}>
              <button type="button" onClick={saveEdit} disabled={savingEdit || !editMasuk} style={{ flex: 1 }}>
                {savingEdit ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setEditing(false)}
                disabled={savingEdit}
                style={{ flex: 1 }}
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {error && <p className="form-error" style={{ marginTop: '0.8rem' }}>{error}</p>}
      </div>

      <h2>Riwayat Absen</h2>
      <div className="card">
        {riwayat.length === 0 ? (
          <p className="muted">Belum ada riwayat absen.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Masuk</th>
                <th>Keluar</th>
              </tr>
            </thead>
            <tbody>
              {riwayat.map((row) => (
                <tr key={row.id}>
                  <td>{formatTanggalWIB(row.tanggal)}</td>
                  <td>
                    {formatJamWIB(row.jam_masuk)}
                    {row.masuk_di_luar_jam && ' ⚠'}
                  </td>
                  <td>
                    {formatJamWIB(row.jam_keluar)}
                    {row.keluar_di_luar_jam && ' ⚠'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
