create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  display_name text not null,
  description text not null,
  status text not null check (status in ('active', 'inactive', 'deprecated')),
  version text not null,
  owner text not null,
  lifecycle_state text not null check (lifecycle_state in ('proposed', 'registered', 'live', 'suspended', 'retired')),
  integration_status text not null check (integration_status in ('pending', 'integrated', 'blocked', 'not_applicable')),
  registered_capabilities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists repositories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  display_name text not null,
  description text not null,
  status text not null check (status in ('active', 'inactive', 'deprecated')),
  version text not null,
  owner text not null,
  git_url text not null,
  default_branch text not null,
  owning_product text references products(key) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists capabilities (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  display_name text not null,
  description text not null,
  status text not null check (status in ('active', 'inactive', 'deprecated')),
  version text not null,
  owner text not null,
  owning_product text references products(key) on delete restrict,
  maturity text not null check (maturity in ('alpha', 'beta', 'stable', 'deprecated')),
  dependencies text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_contracts (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  display_name text not null,
  description text not null,
  status text not null check (status in ('active', 'inactive', 'deprecated')),
  version text not null,
  owner text not null,
  event_name text not null,
  producer text not null references products(key) on delete restrict,
  consumers text[] not null default '{}',
  schema_version text not null,
  payload_schema jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists capabilities_owning_product_idx on capabilities(owning_product);
create index if not exists repositories_owning_product_idx on repositories(owning_product);
create index if not exists event_contracts_producer_idx on event_contracts(producer);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on products;
create trigger set_products_updated_at
before update on products
for each row execute function set_updated_at();

drop trigger if exists set_repositories_updated_at on repositories;
create trigger set_repositories_updated_at
before update on repositories
for each row execute function set_updated_at();

drop trigger if exists set_capabilities_updated_at on capabilities;
create trigger set_capabilities_updated_at
before update on capabilities
for each row execute function set_updated_at();

drop trigger if exists set_event_contracts_updated_at on event_contracts;
create trigger set_event_contracts_updated_at
before update on event_contracts
for each row execute function set_updated_at();
