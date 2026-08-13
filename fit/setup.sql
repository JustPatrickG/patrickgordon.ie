-- ============ pg/fit — run once in Supabase SQL editor ============
-- Uses your existing project (same one as the patrickgordon.ie dashboard).
-- Everything is locked to your logged-in user via RLS.

-- daily totals (steps live here; protein/kcal are derived from food_log)
create table if not exists fit_days (
  date date not null,
  user_id uuid not null default auth.uid(),
  steps int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (date, user_id)
);

create table if not exists fit_food_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  date date not null,
  name text not null,
  protein int not null default 0,
  kcal int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists fit_food_log_date on fit_food_log (user_id, date);

create table if not exists fit_quick_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  protein int not null default 0,
  kcal int not null default 0,
  unique (user_id, name)
);

create table if not exists fit_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  date date not null,
  title text not null,
  mins int not null default 0,
  sets int not null default 0,
  data jsonb not null default '[]', -- exercises + sets detail
  created_at timestamptz not null default now()
);
create index if not exists fit_workouts_date on fit_workouts (user_id, date);

create table if not exists fit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  date date not null,
  title text not null,
  type text not null default 'other' check (type in ('train','shoot','other')),
  time text
);
create index if not exists fit_events_date on fit_events (user_id, date);

-- ============ RLS: only you ============
alter table fit_days enable row level security;
alter table fit_food_log enable row level security;
alter table fit_quick_foods enable row level security;
alter table fit_workouts enable row level security;
alter table fit_events enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fit_days','fit_food_log','fit_quick_foods','fit_workouts','fit_events'] loop
    execute format('drop policy if exists "own rows" on %I', t);
    execute format(
      'create policy "own rows" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ============ steps endpoint for the Apple Shortcut ============
-- The Shortcut can't log in, so it calls this RPC with a secret instead.
-- 1) Replace the secret below with your own long random string.
-- 2) Replace YOUR-USER-UUID with your auth user id
--    (Supabase dashboard -> Authentication -> Users -> copy your id).

create or replace function fit_log_steps(p_secret text, p_steps int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret <> 'CHANGE-ME-to-a-long-random-secret' then
    raise exception 'nope';
  end if;
  insert into fit_days (date, user_id, steps, updated_at)
  values (current_date, 'YOUR-USER-UUID'::uuid, greatest(p_steps, 0), now())
  on conflict (date, user_id)
  do update set steps = excluded.steps, updated_at = now();
end;
$$;

revoke all on function fit_log_steps(text, int) from public;
grant execute on function fit_log_steps(text, int) to anon;
