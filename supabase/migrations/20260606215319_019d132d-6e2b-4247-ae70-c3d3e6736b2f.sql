create table if not exists public.prayer_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request text not null,
  status text not null default 'open' check (status in ('open','answered')),
  answered_note text,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists prayer_log_user_id_idx on public.prayer_log (user_id);
create index if not exists prayer_log_status_idx on public.prayer_log (user_id, status);

grant select, insert, update on public.prayer_log to authenticated;
grant all on public.prayer_log to service_role;

alter table public.prayer_log enable row level security;

drop policy if exists "Users can view their own prayers" on public.prayer_log;
create policy "Users can view their own prayers"
  on public.prayer_log for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own prayers" on public.prayer_log;
create policy "Users can create their own prayers"
  on public.prayer_log for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own prayers" on public.prayer_log;
create policy "Users can update their own prayers"
  on public.prayer_log for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.prayer_log_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prayer_log_updated_at on public.prayer_log;
create trigger prayer_log_updated_at
  before update on public.prayer_log
  for each row execute function public.prayer_log_set_updated_at();