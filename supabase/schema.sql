-- Esquema para la sincronización en la nube (Supabase / PostgreSQL).
-- Ejecútalo una vez en Supabase > SQL Editor.
-- Cada usuario solo puede ver y modificar sus propias filas (Row Level Security).

create table if not exists public.categories (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  name       text        not null,
  type       text        not null check (type in ('expense', 'income')),
  icon       text        not null default '📦',
  color      text        not null default '#64748b',
  keywords   text[]      not null default '{}',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted    boolean     not null default false,
  synced_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.transactions (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id          text        not null,
  type        text        not null check (type in ('expense', 'income')),
  amount      bigint      not null check (amount >= 0), -- centavos
  description text        not null default '',
  category_id text        not null,
  date        date        not null,
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted     boolean     not null default false,
  synced_at   timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists categories_sync_idx   on public.categories   (user_id, synced_at);
create index if not exists transactions_sync_idx on public.transactions (user_id, synced_at);
create index if not exists transactions_date_idx on public.transactions (user_id, date);

-- synced_at lo pone siempre el servidor: es el cursor con el que cada dispositivo pide "lo nuevo".
-- Si llega una versión más vieja que la guardada, se conserva la guardada (last-write-wins)
-- pero se actualiza synced_at para que el dispositivo que la envió descargue la ganadora.
create or replace function public.touch_synced_at() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    new := old;
  end if;
  new.synced_at := now();
  return new;
end $$;

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before insert or update on public.categories
  for each row execute function public.touch_synced_at();

drop trigger if exists transactions_touch on public.transactions;
create trigger transactions_touch before insert or update on public.transactions
  for each row execute function public.touch_synced_at();

alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own transactions" on public.transactions;
create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
