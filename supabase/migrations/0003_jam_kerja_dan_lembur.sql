-- ============================================================================
-- Pengaturan jendela jam absen (masuk/keluar) + pemisahan format lembur/cuti
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Pengaturan jam absen (singleton row, diedit lewat Supabase Studio /
--    service role - belum ada UI admin di MVP ini)
-- ----------------------------------------------------------------------------
create table public.pengaturan_absen (
  id boolean primary key default true check (id),
  jam_masuk_awal time not null default '06:00',
  jam_masuk_akhir time not null default '10:00',
  jam_keluar_awal time not null default '15:00',
  jam_keluar_akhir time not null default '20:00',
  jam_kerja_standar time not null default '08:00',
  updated_at timestamptz not null default now()
);

comment on table public.pengaturan_absen is 'Satu baris pengaturan jendela jam absen. Aturan bersifat lunak (tidak memblokir insert) - hanya menandai absensi.masuk_di_luar_jam/keluar_di_luar_jam untuk pelaporan.';

insert into public.pengaturan_absen (id) values (true);

alter table public.pengaturan_absen enable row level security;

create policy "pengaturan_absen_select_all"
  on public.pengaturan_absen for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 2. Tandai absensi yang di luar jendela jam (lunak, tidak menolak insert)
-- ----------------------------------------------------------------------------
alter table public.absensi add column masuk_di_luar_jam boolean not null default false;
alter table public.absensi add column keluar_di_luar_jam boolean not null default false;

create or replace function public.flag_absen_di_luar_jam()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg record;
  jam_masuk_wib time;
  jam_keluar_wib time;
begin
  select * into cfg from public.pengaturan_absen limit 1;

  if new.jam_masuk is not null then
    jam_masuk_wib := (new.jam_masuk at time zone 'Asia/Jakarta')::time;
    new.masuk_di_luar_jam := jam_masuk_wib < cfg.jam_masuk_awal or jam_masuk_wib > cfg.jam_masuk_akhir;
  end if;

  if new.jam_keluar is not null then
    jam_keluar_wib := (new.jam_keluar at time zone 'Asia/Jakarta')::time;
    new.keluar_di_luar_jam := jam_keluar_wib < cfg.jam_keluar_awal or jam_keluar_wib > cfg.jam_keluar_akhir;
  end if;

  return new;
end;
$$;

create trigger trg_flag_absen_di_luar_jam
  before insert or update on public.absensi
  for each row execute function public.flag_absen_di_luar_jam();

revoke execute on function public.flag_absen_di_luar_jam() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Format lembur: satu hari + rentang jam (bukan rentang tanggal + total jam)
-- ----------------------------------------------------------------------------
alter table public.pengajuan add column jam_mulai time;
alter table public.pengajuan add column jam_selesai time;

-- Backfill data uji coba yang sudah ada (jam_lembur=5 -> perkiraan rentang jam).
-- trg_validate_pengajuan_update dirancang untuk membatasi approver, bukan
-- migrasi data - dimatikan sementara khusus untuk UPDATE backfill ini.
alter table public.pengajuan disable trigger trg_validate_pengajuan_update;

update public.pengajuan
   set jam_mulai = '13:00', jam_selesai = '18:00'
 where jenis = 'lembur' and jam_mulai is null;

alter table public.pengajuan enable trigger trg_validate_pengajuan_update;

alter table public.pengajuan drop constraint jam_lembur_hanya_untuk_lembur;
alter table public.pengajuan drop column jam_lembur;

-- Alasan tetap wajib untuk cuti, opsional untuk lembur (jadi "Keterangan" di UI).
alter table public.pengajuan alter column alasan drop not null;

alter table public.pengajuan add constraint alasan_wajib_untuk_cuti
  check (jenis <> 'cuti' or (alasan is not null and length(trim(alasan)) > 0));

alter table public.pengajuan add constraint lembur_jam_wajib
  check (jenis <> 'lembur' or (jam_mulai is not null and jam_selesai is not null and jam_selesai > jam_mulai));

alter table public.pengajuan add constraint lembur_satu_hari
  check (jenis <> 'lembur' or tanggal_mulai = tanggal_selesai);

alter table public.pengajuan add constraint cuti_tanpa_jam
  check (jenis <> 'cuti' or (jam_mulai is null and jam_selesai is null));
