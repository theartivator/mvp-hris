-- ============================================================================
-- MVP PWA Absensi & Pengajuan Cuti/Lembur - Initial schema + RLS
-- ============================================================================
-- Roles: staff, intern, volunteer, spv, manager, direktur, hr
-- Semua role bisa absen. Intern & volunteer TIDAK berhak mengajukan cuti/lembur
-- (ditegakkan di RLS, bukan hanya UI).
--
-- Catatan asumsi (tidak dirinci eksplisit di spesifikasi):
--  - Role "hr" tidak disebutkan di skema approval. HR diperlakukan sama seperti
--    "staff" (approval1 = atasan_level1, approval2 = atasan_level2), dan TIDAK
--    tampil sebagai approver di menu Approval (mengikuti spesifikasi bahwa menu
--    Approval hanya untuk spv/manager/direktur). Sesuaikan bila kebijakan HR
--    Anda berbeda.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. profiles
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null,
  role text not null check (role in ('staff', 'intern', 'volunteer', 'spv', 'manager', 'direktur', 'hr')),
  atasan_level1_id uuid references public.profiles (id),
  atasan_level2_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Data pegawai. role menentukan hak akses fitur pengajuan/approval.';
comment on column public.profiles.atasan_level1_id is 'Approver pertama (mis. SPV bagi staff, Manager bagi SPV, Direktur bagi Manager).';
comment on column public.profiles.atasan_level2_id is 'Approver kedua, hanya relevan untuk role staff (mis. Manager).';

-- ----------------------------------------------------------------------------
-- 2. absensi
-- ----------------------------------------------------------------------------
create table public.absensi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tanggal date not null,
  jam_masuk timestamptz,
  jam_keluar timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, tanggal),
  constraint jam_keluar_setelah_masuk check (
    jam_keluar is null or jam_masuk is null or jam_keluar > jam_masuk
  )
);

comment on table public.absensi is 'Satu baris per user per tanggal (WIB). jam_masuk/jam_keluar diisi via absen masuk/keluar.';

-- ----------------------------------------------------------------------------
-- 3. pengajuan
-- ----------------------------------------------------------------------------
create table public.pengajuan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  jenis text not null check (jenis in ('cuti', 'lembur')),
  tanggal_mulai date not null,
  tanggal_selesai date not null,
  jam_lembur numeric,
  alasan text not null,
  status text not null default 'pending_approval1'
    check (status in ('pending_approval1', 'pending_approval2', 'approved', 'rejected')),
  approver1_id uuid references public.profiles (id),
  approver1_status text not null default 'pending'
    check (approver1_status in ('pending', 'approved', 'rejected')),
  approver2_id uuid references public.profiles (id),
  approver2_status text not null default 'pending'
    check (approver2_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  constraint tanggal_valid check (tanggal_selesai >= tanggal_mulai),
  constraint jam_lembur_hanya_untuk_lembur check (
    (jenis = 'lembur' and jam_lembur is not null) or (jenis = 'cuti' and jam_lembur is null)
  )
);

comment on table public.pengajuan is 'Pengajuan cuti/lembur. approver1_id/approver2_id & status ditentukan otomatis oleh trigger set_pengajuan_approval berdasarkan role & hierarki atasan pemohon - TIDAK dipercaya dari input client.';

-- ----------------------------------------------------------------------------
-- 4. log (append-only audit trail)
-- ----------------------------------------------------------------------------
create table public.log (
  id uuid primary key default gen_random_uuid(),
  "timestamp" timestamptz not null default now(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  detail jsonb
);

comment on table public.log is 'Append-only audit log. Tidak ada policy update/delete untuk role non-service.';

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index idx_absensi_user_tanggal on public.absensi (user_id, tanggal desc);
create index idx_pengajuan_user on public.pengajuan (user_id, created_at desc);
create index idx_pengajuan_approver1 on public.pengajuan (approver1_id, status);
create index idx_pengajuan_approver2 on public.pengajuan (approver2_id, status);
create index idx_profiles_atasan1 on public.profiles (atasan_level1_id);
create index idx_profiles_atasan2 on public.profiles (atasan_level2_id);
create index idx_log_user on public.log (user_id, "timestamp" desc);

-- ----------------------------------------------------------------------------
-- Trigger: auto-create profile row saat user baru mendaftar (Supabase Auth)
-- ----------------------------------------------------------------------------
-- Role default = 'staff'. Admin/HR WAJIB menyesuaikan role & atasan_level1_id /
-- atasan_level2_id secara manual (mis. via Supabase Studio table editor) setelah
-- registrasi, karena self-service role selection adalah risiko keamanan.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama', new.email),
    'staff'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Trigger: tentukan approver1_id / approver2_id / status saat pengajuan dibuat
-- ----------------------------------------------------------------------------
create or replace function public.set_pengajuan_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pemohon record;
begin
  select role, atasan_level1_id, atasan_level2_id
    into pemohon
    from public.profiles
   where id = new.user_id;

  if pemohon is null then
    raise exception 'Profil pemohon tidak ditemukan';
  end if;

  if pemohon.role in ('intern', 'volunteer') then
    raise exception 'Role % tidak berhak mengajukan cuti/lembur', pemohon.role;
  end if;

  -- Client tidak boleh menentukan sendiri approver/status; selalu dihitung ulang di sini.
  new.approver1_status := 'pending';
  new.approver2_status := 'pending';

  if pemohon.role = 'direktur' then
    new.approver1_id := null;
    new.approver2_id := null;
    new.status := 'approved';
    new.approver1_status := 'approved';
    new.approver2_status := 'approved';

  elsif pemohon.role in ('staff', 'hr') then
    if pemohon.atasan_level1_id is null or pemohon.atasan_level2_id is null then
      raise exception 'Atasan level 1 dan level 2 belum diset untuk pemohon ini';
    end if;
    new.approver1_id := pemohon.atasan_level1_id;
    new.approver2_id := pemohon.atasan_level2_id;
    new.status := 'pending_approval1';

  elsif pemohon.role in ('spv', 'manager') then
    if pemohon.atasan_level1_id is null then
      raise exception 'Atasan level 1 belum diset untuk pemohon ini';
    end if;
    new.approver1_id := pemohon.atasan_level1_id;
    new.approver2_id := null;
    new.status := 'pending_approval1';

  else
    raise exception 'Role % tidak dikenali untuk alur approval', pemohon.role;
  end if;

  return new;
end;
$$;

create trigger trg_set_pengajuan_approval
  before insert on public.pengajuan
  for each row execute function public.set_pengajuan_approval();

-- ----------------------------------------------------------------------------
-- Trigger: validasi transisi approval saat update (approve/reject)
-- ----------------------------------------------------------------------------
-- Memastikan hanya approver yang berhak & sedang gilirannya yang bisa mengubah
-- status, dan mencegah kolom lain (alasan, tanggal, dst) diubah lewat jalur ini.
create or replace function public.validate_pengajuan_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Kunci semua kolom kecuali status/approver*_status agar tidak bisa dimanipulasi.
  if new.user_id is distinct from old.user_id
     or new.jenis is distinct from old.jenis
     or new.tanggal_mulai is distinct from old.tanggal_mulai
     or new.tanggal_selesai is distinct from old.tanggal_selesai
     or new.jam_lembur is distinct from old.jam_lembur
     or new.alasan is distinct from old.alasan
     or new.approver1_id is distinct from old.approver1_id
     or new.approver2_id is distinct from old.approver2_id
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Kolom pengajuan selain status hanya bisa diubah oleh sistem';
  end if;

  if auth.uid() = old.approver1_id and old.status = 'pending_approval1' then
    if new.approver1_status not in ('approved', 'rejected') then
      raise exception 'approver1_status harus approved atau rejected';
    end if;
    if new.approver2_status is distinct from old.approver2_status then
      raise exception 'approver1 tidak berhak mengubah approver2_status';
    end if;

    if new.approver1_status = 'rejected' then
      new.status := 'rejected';
    elsif new.approver2_id is null then
      new.status := 'approved';
    else
      new.status := 'pending_approval2';
    end if;

  elsif auth.uid() = old.approver2_id and old.status = 'pending_approval2' then
    if new.approver2_status not in ('approved', 'rejected') then
      raise exception 'approver2_status harus approved atau rejected';
    end if;
    if new.approver1_status is distinct from old.approver1_status then
      raise exception 'approver2 tidak berhak mengubah approver1_status';
    end if;

    if new.approver2_status = 'rejected' then
      new.status := 'rejected';
    else
      new.status := 'approved';
    end if;

  else
    raise exception 'Anda tidak berhak mengubah pengajuan ini pada status saat ini';
  end if;

  return new;
end;
$$;

create trigger trg_validate_pengajuan_update
  before update on public.pengajuan
  for each row execute function public.validate_pengajuan_update();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.absensi enable row level security;
alter table public.pengajuan enable row level security;
alter table public.log enable row level security;

-- profiles: select diri sendiri, atasan sendiri, ATAU bawahan (agar approver bisa
-- menampilkan nama pemohon di halaman Approval). Tidak ada insert/update/delete
-- untuk role authenticated - profil dibuat via trigger handle_new_user dan
-- diubah oleh admin/HR lewat service role.
create policy "profiles_select_self_atasan_bawahan"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or id in (
      select p.atasan_level1_id from public.profiles p where p.id = auth.uid()
      union
      select p.atasan_level2_id from public.profiles p where p.id = auth.uid()
    )
    or auth.uid() in (atasan_level1_id, atasan_level2_id)
  );

-- absensi: hanya baris milik sendiri yang bisa dibaca/insert/update.
create policy "absensi_select_own"
  on public.absensi for select
  to authenticated
  using (user_id = auth.uid());

create policy "absensi_insert_own"
  on public.absensi for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "absensi_update_own"
  on public.absensi for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- pengajuan: insert ditolak total untuk intern/volunteer (defense in depth,
-- selain juga dicek di trigger set_pengajuan_approval).
create policy "pengajuan_insert_not_intern_volunteer"
  on public.pengajuan for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (select role from public.profiles where id = auth.uid()) not in ('intern', 'volunteer')
  );

-- select: pemohon sendiri, atau approver yang ditunjuk (di step manapun agar
-- riwayat/status tetap terlihat oleh approver2 walau masih di approval1).
create policy "pengajuan_select_own_or_approver"
  on public.pengajuan for select
  to authenticated
  using (
    user_id = auth.uid()
    or auth.uid() = approver1_id
    or auth.uid() = approver2_id
  );

-- update: hanya approver yang sedang gilirannya. Validasi detail transisi
-- dilakukan di trigger validate_pengajuan_update di atas.
create policy "pengajuan_update_approver_turn"
  on public.pengajuan for update
  to authenticated
  using (
    (auth.uid() = approver1_id and status = 'pending_approval1')
    or (auth.uid() = approver2_id and status = 'pending_approval2')
  )
  with check (
    auth.uid() in (approver1_id, approver2_id)
  );

-- log: append-only. Insert hanya untuk baris milik sendiri. Select baris milik
-- sendiri saja untuk user biasa; audit menyeluruh dilakukan lewat service role.
-- Tidak ada policy update/delete sama sekali -> default deny untuk semua role.
create policy "log_insert_own"
  on public.log for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "log_select_own"
  on public.log for select
  to authenticated
  using (user_id = auth.uid());
