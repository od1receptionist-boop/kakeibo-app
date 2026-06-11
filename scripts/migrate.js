import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Client } = pg
const __dir = dirname(fileURLToPath(import.meta.url))

// .env.local から読み込む
const envFile = readFileSync(join(__dir, '../.env.local'), 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const client = new Client({ connectionString: env.POSTGRES_URL_NON_POOLING })

await client.connect()

await client.query(`
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  amount float8 not null,
  currency text not null default 'USD',
  merchant text not null default 'Unknown',
  category text not null default 'other',
  source text not null default 'manual',
  is_pending boolean not null default false,
  raw text,
  created_at timestamptz not null default now()
);
`)
console.log('✓ transactions table')

await client.query(`alter table public.transactions enable row level security;`)
await client.query(`
  do $$ begin
    if not exists (select 1 from pg_policies where tablename='transactions' and policyname='users_own_transactions') then
      create policy "users_own_transactions" on public.transactions for all
        using (auth.uid() = user_id) with check (auth.uid() = user_id);
    end if;
  end $$;
`)
await client.query(`create index if not exists tx_user_date_idx on public.transactions (user_id, date);`)
console.log('✓ transactions RLS + index')

await client.query(`
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  webhook_token text unique default gen_random_uuid()::text,
  default_currency text not null default 'USD',
  created_at timestamptz not null default now()
);
`)
await client.query(`alter table public.user_profiles enable row level security;`)
await client.query(`
  do $$ begin
    if not exists (select 1 from pg_policies where tablename='user_profiles' and policyname='users_own_profile') then
      create policy "users_own_profile" on public.user_profiles for all
        using (auth.uid() = user_id) with check (auth.uid() = user_id);
    end if;
  end $$;
`)
console.log('✓ user_profiles table')

await client.query(`
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();
`)
console.log('✓ auto profile trigger')

await client.end()
console.log('\n✅ Migration complete')
