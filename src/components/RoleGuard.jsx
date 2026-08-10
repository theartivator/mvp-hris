// Guard UI (bukan satu-satunya lapisan keamanan - RLS di Supabase adalah
// penegakan sesungguhnya). Menyembunyikan halaman untuk role yang tidak berhak
// dan menampilkan pesan alih-alih memaksa insert yang akan ditolak backend.
export default function RoleGuard({ allowed, children }) {
  if (!allowed) {
    return (
      <div className="card">
        <p>Fitur ini tidak tersedia untuk role Anda.</p>
      </div>
    )
  }
  return children
}
