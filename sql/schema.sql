-- =============================================================================
-- schema.sql — full reset migration
--
-- Run this entire file to wipe and rebuild the schema from scratch.
-- Safe to run multiple times. Data will be destroyed on each run.
--
-- To make a schema change:
--   1. Update the relevant CREATE TABLE / CREATE FUNCTION / etc. block below.
--   2. Re-run this entire file against your database.
-- =============================================================================


-- =============================================================================
-- RESET — tear down in reverse dependency order
-- =============================================================================

drop trigger  if exists on_auth_user_created    on auth.users;
drop function if exists public.handle_new_user  () cascade;

drop table if exists public.trade_exits   cascade;
drop table if exists public.trade_entries cascade;
drop table if exists public.profiles      cascade;

-- legacy table name, kept for safety
drop table if exists public.trades cascade;


-- =============================================================================
-- TABLE: profiles
-- One row per user. Auto-populated via trigger on signup.
-- =============================================================================

create table public.profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  display_name text        not null default '',
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using    (auth.uid() = id)
  with check (auth.uid() = id);


-- =============================================================================
-- TABLE: trade_entries
-- One row per trade open.
-- =============================================================================

create table public.trade_entries (
  id          uuid           primary key default gen_random_uuid(),
  user_id     uuid           not null references auth.users(id) on delete cascade,
  trade_date  date           not null,
  name        text           not null default '',
  amount_in   numeric(12,2)  not null default 0,
  created_at  timestamptz    not null default now()
);

alter table public.trade_entries enable row level security;

create policy "trade_entries: select own"
  on public.trade_entries for select
  using (auth.uid() = user_id);

create policy "trade_entries: insert own"
  on public.trade_entries for insert
  with check (auth.uid() = user_id);

create policy "trade_entries: update own"
  on public.trade_entries for update
  using    (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "trade_entries: delete own"
  on public.trade_entries for delete
  using (auth.uid() = user_id);

create index trade_entries_user_date_idx on public.trade_entries (user_id, trade_date);


-- =============================================================================
-- TABLE: trade_exits
-- One or more exits (take-profits) per trade entry.
-- =============================================================================

create table public.trade_exits (
  id          uuid           primary key default gen_random_uuid(),
  entry_id    uuid           not null references public.trade_entries(id) on delete cascade,
  amount_out  numeric(12,2)  not null default 0,
  created_at  timestamptz    not null default now()
);

alter table public.trade_exits enable row level security;

-- RLS is enforced by joining back to trade_entries to verify ownership.
create policy "trade_exits: select own"
  on public.trade_exits for select
  using (
    exists (
      select 1 from public.trade_entries e
      where e.id = trade_exits.entry_id
        and e.user_id = auth.uid()
    )
  );

create policy "trade_exits: insert own"
  on public.trade_exits for insert
  with check (
    exists (
      select 1 from public.trade_entries e
      where e.id = trade_exits.entry_id
        and e.user_id = auth.uid()
    )
  );

create policy "trade_exits: update own"
  on public.trade_exits for update
  using (
    exists (
      select 1 from public.trade_entries e
      where e.id = trade_exits.entry_id
        and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trade_entries e
      where e.id = trade_exits.entry_id
        and e.user_id = auth.uid()
    )
  );

create policy "trade_exits: delete own"
  on public.trade_exits for delete
  using (
    exists (
      select 1 from public.trade_entries e
      where e.id = trade_exits.entry_id
        and e.user_id = auth.uid()
    )
  );

create index trade_exits_entry_id_idx on public.trade_exits (entry_id);


-- =============================================================================
-- FUNCTION & TRIGGER: auto-create profile on signup
-- =============================================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
