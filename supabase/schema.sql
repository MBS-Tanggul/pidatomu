-- ============================================================
-- Pidatomu - Supabase Schema
-- Guest (device_id) + Optional Login, dengan rate limiting atomic
-- ============================================================

-- Ekstensi buat gen_random_uuid()
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. profiles: satu baris per user yang login (Supabase Auth)
-- ------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: user can read own row"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: user can update own row"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create profile saat user baru sign up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- 2. speeches: histori naskah pidato
--    owner_type + owner_ref dipakai supaya guest & user login
--    bisa disimpan di tabel yang sama
-- ------------------------------------------------------------
create table if not exists speeches (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('guest', 'user')),
  owner_ref text not null,          -- device_id (guest) atau auth.uid()::text (user)
  kategori text,                    -- Khutbah Jumat, Kultum Subuh, dll
  tema text,
  durasi int,
  konten text not null,
  ai_provider text not null check (ai_provider in ('groq', 'gemini')),
  created_at timestamptz not null default now()
);

create index if not exists idx_speeches_owner
  on speeches (owner_type, owner_ref, created_at desc);

alter table speeches enable row level security;

-- Guest: akses dikontrol lewat service role di server (bukan direct client access),
-- jadi tidak perlu policy khusus guest di sini.
-- User login: hanya boleh lihat/insert baris miliknya sendiri.
create policy "speeches: user can read own"
  on speeches for select
  using (owner_type = 'user' and owner_ref = auth.uid()::text);

create policy "speeches: user can insert own"
  on speeches for insert
  with check (owner_type = 'user' and owner_ref = auth.uid()::text);

-- ------------------------------------------------------------
-- 3. rate_limits: satu baris per (owner, hari)
-- ------------------------------------------------------------
create table if not exists rate_limits (
  owner_type text not null check (owner_type in ('guest', 'user')),
  owner_ref text not null,
  window_date date not null default current_date,
  request_count int not null default 0,
  primary key (owner_type, owner_ref, window_date)
);

alter table rate_limits enable row level security;
-- Tabel ini hanya diakses via RPC security definer di bawah, jadi tidak
-- perlu policy select/insert langsung untuk client.

-- ------------------------------------------------------------
-- 4. RPC: increment_rate_limit
--    Atomic check-and-increment, aman dari race condition.
--    Return: { allowed: bool, current_count: int, limit: int }
-- ------------------------------------------------------------
create or replace function increment_rate_limit(
  p_owner_type text,
  p_owner_ref text,
  p_max_per_day int
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
begin
  insert into rate_limits (owner_type, owner_ref, window_date, request_count)
  values (p_owner_type, p_owner_ref, current_date, 0)
  on conflict (owner_type, owner_ref, window_date) do nothing;

  update rate_limits
    set request_count = request_count + 1
    where owner_type = p_owner_type
      and owner_ref = p_owner_ref
      and window_date = current_date
      and request_count < p_max_per_day
    returning request_count into v_count;

  if v_count is null then
    -- update tidak match (sudah kena limit) → ambil count saat ini buat info
    select request_count into v_count
      from rate_limits
      where owner_type = p_owner_type
        and owner_ref = p_owner_ref
        and window_date = current_date;

    return jsonb_build_object(
      'allowed', false,
      'current_count', v_count,
      'limit', p_max_per_day
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'current_count', v_count,
    'limit', p_max_per_day
  );
end;
$$;

-- Izinkan dipanggil dari client (anon) & authenticated, karena guest juga perlu akses
grant execute on function increment_rate_limit(text, text, int) to anon, authenticated;