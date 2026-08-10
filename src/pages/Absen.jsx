import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { tanggalWIB, formatTanggalWIB, formatJamWIB } from '../lib/waktu'

export default function Absen() {
  const { user } = useAuth()
  const [today, setToday] = useState(null)
  const [riwayat, setRiwayat] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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

  async function absenMasuk() {
    setBusy(true)
    setError('')
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('absensi')
      .insert({ user_id: user.id, tanggal: tanggalWIB(), jam_masuk: now })
    if (!error) {
      await supabase
        .from('log')
        .insert({ user_id: user.id, action: 'absen_masuk', detail: { tanggal: tanggalWIB() } })
    }
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      await load()
    }
  }

  async function absenKeluar() {
    if (!today) return
    setBusy(true)
    setError('')
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('absensi')
      .update({ jam_keluar: now })
      .eq('id', today.id)
    if (!error) {
      await supabase
        .from('log')
        .insert({ user_id: user.id, action: 'absen_keluar', detail: { tanggal: tanggalWIB() } })
    }
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      await load()
    }
  }

  if (loading) return <div className="page-loading">Memuat...</div>

  return (
    <div className="page">
      <h1>Absen</h1>
      <div className="card">
        <p className="muted">{formatTanggalWIB(tanggalWIB())}</p>
        <div className="absen-status">
          <div>
            <span className="label">Masuk</span>
            <span className="value">{formatJamWIB(today?.jam_masuk)}</span>
          </div>
          <div>
            <span className="label">Keluar</span>
            <span className="value">{formatJamWIB(today?.jam_keluar)}</span>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="btn-row">
          <button onClick={absenMasuk} disabled={busy || !!today}>
            Absen Masuk
          </button>
          <button
            onClick={absenKeluar}
            disabled={busy || !today || !!today?.jam_keluar}
          >
            Absen Keluar
          </button>
        </div>
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
                  <td>{formatJamWIB(row.jam_masuk)}</td>
                  <td>{formatJamWIB(row.jam_keluar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
