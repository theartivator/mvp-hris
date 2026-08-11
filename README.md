# Absensi & Pengajuan Cuti/Lembur (MVP PWA)

React + Vite (PWA) + Supabase (Postgres + Auth + RLS), deploy ke Vercel.

## Fitur

- Login pakai **username + password** (Register tetap minta email untuk Supabase Auth di baliknya; login page resolve username → email lewat RPC `email_for_username` sebelum panggil `signInWithPassword`, lihat `supabase/migrations/0002_username_login.sql`)
- Absen masuk/keluar (timestamp WIB) + riwayat absen pribadi
- Pengajuan cuti/lembur dengan alur approval bertingkat sesuai role
- Halaman Approval untuk SPV/Manager/Direktur
- Intern & Volunteer hanya punya akses Absen — ditegakkan di **RLS Supabase**, bukan hanya UI
- Installable sebagai PWA (Add to Home Screen)

## Skema approval

- Staff/HR mengajukan → approval1 = atasan_level1 (SPV) → approval2 = atasan_level2 (Manager) → approved
- SPV mengajukan → approval1 = atasan_level1 (Manager) → approved
- Manager mengajukan → approval1 = atasan_level1 (Direktur) → approved
- Direktur mengajukan → auto-approved
- Intern & Volunteer tidak bisa insert ke tabel `pengajuan` sama sekali (RLS + trigger)
- Reject di approval1 → status langsung `rejected`, tidak lanjut ke approval2

`approver1_id`/`approver2_id`/`status` **tidak pernah dipercaya dari input client** — semuanya dihitung ulang oleh trigger Postgres (`set_pengajuan_approval`, `validate_pengajuan_update`) berdasarkan `role` dan `atasan_level1_id`/`atasan_level2_id` di tabel `profiles`.

> **Asumsi:** skema approval role `hr` tidak dirinci di spesifikasi awal. HR diperlakukan sama seperti `staff` (approval1 → approval2) dan tidak tampil di menu Approval (mengikuti spesifikasi bahwa Approval hanya untuk spv/manager/direktur). Sesuaikan `supabase/migrations/0001_init.sql` bila kebijakan berbeda.

## 1. Setup Supabase

> Repo `mvp-hris` ini memakai project Supabase yang sama dengan yang sudah
> dibuat & di-migrate sebelumnya (bukan project baru, karena akun sudah kena
> limit 2 project gratis): project `pwa-hris` (region `ap-southeast-1`, ref
> `zffoxgmfbfknnsflvpxy`) di organisasi `theartivator's`. Ambil
> `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari Supabase Dashboard
> project tersebut > **Project Settings > API**. Langkah di bawah ini untuk
> referensi bila suatu saat perlu project Supabase terpisah dari nol.

1. Buat project baru di [supabase.com](https://supabase.com) (catat region terdekat, mis. Singapore).
2. Buka **SQL Editor**, jalankan seluruh isi `supabase/migrations/0001_init.sql`.
   - Atau via Supabase CLI: `supabase link --project-ref <project-ref>` lalu `supabase db push`.
3. Buka **Project Settings > API**, salin `Project URL` dan `anon public` key.
4. **Setelah user mendaftar** (via halaman Register di app), profil otomatis dibuat dengan `role = 'staff'` dan `atasan_level1_id`/`atasan_level2_id` kosong (lewat trigger `handle_new_user`). Admin/HR **wajib** membuka tabel `profiles` di Supabase Studio (Table Editor) dan mengisi manual:
   - `role` yang benar (`staff`/`intern`/`volunteer`/`spv`/`manager`/`direktur`/`hr`)
   - `atasan_level1_id` (dan `atasan_level2_id` untuk staff/hr) merujuk ke `id` profil atasan yang bersangkutan

   Role tidak boleh self-service karena itu akan jadi celah keamanan (user bisa mengangkat diri sendiri jadi direktur).

## 2. Setup project lokal

```bash
npm install
cp .env.example .env
# isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env
npm run dev
```

Buka `http://localhost:5173`.

## 3. Verifikasi keamanan (WAJIB sebelum dianggap selesai)

Jangan hanya percaya UI yang menyembunyikan menu. Uji langsung lewat akun berbeda role:

1. **Intern/Volunteer tidak bisa mengajukan cuti/lembur**
   - Login sebagai akun dengan `role = 'intern'` atau `'volunteer'`.
   - Coba `insert` langsung ke tabel `pengajuan` (mis. lewat SQL Editor dengan `set role authenticated; set request.jwt.claim.sub = '<uuid intern>';` atau lewat client dengan token akun tsb).
   - Harus ditolak oleh RLS policy `pengajuan_insert_not_intern_volunteer` **dan** trigger `set_pengajuan_approval`.
2. **Alur approval berpindah sesuai skema**, uji dengan 4 akun (staff, spv, manager, direktur) yang atasan-nya sudah diset lengkap:
   - Staff mengajukan → cek `status = 'pending_approval1'`, `approver1_id` = SPV.
   - Login sebagai SPV, approve → cek `status = 'pending_approval2'`, `approver2_id` = Manager.
   - Login sebagai Manager, approve → cek `status = 'approved'`.
   - Ulangi dengan reject di approval1 → pastikan `status = 'rejected'` dan tidak lanjut ke approval2.
   - SPV/Manager mengajukan sendiri → hanya 1 level approval.
   - Direktur mengajukan → langsung `approved`.
3. Cek juga bahwa approver **tidak bisa** meng-update pengajuan yang bukan gilirannya (mis. approver2 mencoba approve saat status masih `pending_approval1` harus ditolak RLS).

> **Sudah diverifikasi end-to-end** langsung di project `pwa-hris` (bukan hanya baca kode) dengan 5 akun uji (intern, staff, spv, manager, direktur) yang dibuat & dihapus lagi setelah selesai — semua 12 skenario di atas (termasuk intern & volunteer, staff→spv→manager, reject di approval1, spv/manager self-submit 1 level, direktur auto-approve, approver bertindak di luar gilirannya, isolasi SELECT antar user) lulus. Proses ini juga menemukan bug nyata: policy `profiles_select_self_atasan_bawahan` awalnya memicu *infinite recursion* karena melakukan subquery ke `profiles` di dalam policy `profiles` itu sendiri — sudah diperbaiki dengan fungsi `SECURITY DEFINER` `current_user_profile()` (lihat `supabase/migrations/0001_init.sql`) yang membaca profil auth.uid() sendiri tanpa memicu ulang RLS.

## 4. Belum dibuat (sesuai batasan MVP, sengaja ditunda)

- Notifikasi otomatis (email/push/reminder absen)
- Perhitungan KPI karyawan
- Fitur HRIS lain (payroll, dll)
- Offline-first / background sync

## 5. Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di [vercel.com](https://vercel.com), **Add New Project** → import repo GitHub tersebut.
3. Framework preset: **Vite**. Build command `npm run build`, output directory `dist` (biasanya terdeteksi otomatis).
4. Di **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Setelah live, buka URL Vercel di HP → browser akan menawarkan "Add to Home Screen" / "Install app" (PWA installable karena manifest + service worker dari `vite-plugin-pwa`).
6. Untuk update selanjutnya, cukup push ke branch yang terhubung — Vercel auto-deploy.

## Struktur project

```
supabase/migrations/0001_init.sql   # schema + RLS + trigger approval
src/lib/supabaseClient.js           # inisialisasi Supabase client
src/context/AuthContext.jsx         # session + profile (role) global
src/components/                     # ProtectedRoute, RoleGuard, Layout/nav
src/pages/                          # Login, Register, Absen, Pengajuan, Approval
```
