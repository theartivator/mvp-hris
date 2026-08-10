const ZONA_WIB = 'Asia/Jakarta'

// Tanggal hari ini di WIB (UTC+7), format YYYY-MM-DD, terlepas dari timezone browser.
export function tanggalWIB(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_WIB,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatTanggalWIB(tanggal) {
  if (!tanggal) return '-'
  return new Date(`${tanggal}T00:00:00+07:00`).toLocaleDateString('id-ID', {
    timeZone: ZONA_WIB,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatJamWIB(iso) {
  if (!iso) return '-'
  return `${new Date(iso).toLocaleTimeString('id-ID', {
    timeZone: ZONA_WIB,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })} WIB`
}
