create table public.google_tokens (
  user_id uuid primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_tokens enable row level security;

create policy "users select own google tokens" on public.google_tokens
  for select using (auth.uid() = user_id);
create policy "users insert own google tokens" on public.google_tokens
  for insert with check (auth.uid() = user_id);
create policy "users update own google tokens" on public.google_tokens
  for update using (auth.uid() = user_id);
create policy "users delete own google tokens" on public.google_tokens
  for delete using (auth.uid() = user_id);

create trigger google_tokens_updated_at
  before update on public.google_tokens
  for each row execute function public.update_updated_at_column();
