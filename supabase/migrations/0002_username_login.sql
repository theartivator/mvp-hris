-- Tambah login berbasis username (selain email tetap dipakai sebagai identitas
-- Supabase Auth yang sesungguhnya). Login page resolve username -> email lewat
-- RPC public.email_for_username sebelum memanggil signInWithPassword.

alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null;

comment on column public.profiles.username is 'Username untuk login (opsional selain email). Unik case-insensitive.';

-- handle_new_user diperbarui: simpan username dari raw_user_meta_data kalau ada.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama', new.email),
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    'staff'
  );
  return new;
end;
$$;

-- RPC publik (anon-callable) untuk resolve username -> email SEBELUM login.
-- Hanya mengembalikan email, tidak ada data lain, tidak butuh autentikasi
-- (karena dipanggil sebelum user punya sesi).
create or replace function public.email_for_username(p_username text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select u.email
    from public.profiles p
    join auth.users u on u.id = p.id
   where lower(p.username) = lower(p_username)
   limit 1
$$;

revoke all on function public.email_for_username(text) from public, anon, authenticated;
grant execute on function public.email_for_username(text) to anon, authenticated;
