-- Full migration: drops and recreates everything from scratch.
-- WARNING: this will delete all existing trade data.

drop table if exists public.trade_exits;
drop table if exists public.trade_entries;
drop table if exists public.trades;

-- Trade entries: one row per trade open
create table public.trade_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  trade_date date not null,
  name text not null default '',
  amount_in numeric(12,2) not null default 0,
  created_at timestamptz default now() not null
);

alter table public.trade_entries enable row level security;

create policy "Users can view own trade entries"
  on public.trade_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own trade entries"
  on public.trade_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own trade entries"
  on public.trade_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own trade entries"
  on public.trade_entries for delete
  using (auth.uid() = user_id);

create index trade_entries_user_date_idx on public.trade_entries (user_id, trade_date);

-- Trade exits: one or more exits per trade entry
create table public.trade_exits (
  id uuid default gen_random_uuid() primary key,
  entry_id uuid references public.trade_entries(id) on delete cascade not null,
  amount_out numeric(12,2) not null default 0,
  created_at timestamptz default now() not null
);

alter table public.trade_exits enable row level security;

create policy "Users can view own trade exits"
  on public.trade_exits for select
  using (
    exists (
      select 1 from public.trade_entries
      where trade_entries.id = trade_exits.entry_id
        and trade_entries.user_id = auth.uid()
    )
  );

create policy "Users can insert own trade exits"
  on public.trade_exits for insert
  with check (
    exists (
      select 1 from public.trade_entries
      where trade_entries.id = trade_exits.entry_id
        and trade_entries.user_id = auth.uid()
    )
  );

create policy "Users can delete own trade exits"
  on public.trade_exits for delete
  using (
    exists (
      select 1 from public.trade_entries
      where trade_entries.id = trade_exits.entry_id
        and trade_entries.user_id = auth.uid()
    )
  );

create policy "Users can update own trade exits"
  on public.trade_exits for update
  using (
    exists (
      select 1 from public.trade_entries
      where trade_entries.id = trade_exits.entry_id
        and trade_entries.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trade_entries
      where trade_entries.id = trade_exits.entry_id
        and trade_entries.user_id = auth.uid()
    )
  );

create index trade_exits_entry_id_idx on public.trade_exits (entry_id);

-- Profiles table: stores user display information
-- Populated from auth.users.raw_user_meta_data on signup
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null default '',
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger to auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
