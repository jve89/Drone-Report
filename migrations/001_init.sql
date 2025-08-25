-- enable crypto if available
-- create extension if not exists pgcrypto;

create table if not exists schema_migrations(
  filename text primary key,
  applied_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  project text not null,
  company text not null,
  contact_name text,
  email text not null,
  phone text,
  site_address text,
  inspection_date date not null default current_date,
  brand_color text,
  logo_url text,
  created_at timestamptz not null default now()
);

create table media (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  kind text not null check (kind in ('image','video')),
  url text not null,
  thumb text,
  filename text,
  mime text,
  size_bytes bigint,
  capture_time timestamptz,
  exif jsonb,
  camera jsonb,
  phash text,
  ref_code text not null,
  position int not null,
  created_at timestamptz not null default now(),
  unique(report_id, ref_code)
);

create table findings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  title text,
  caption text,
  severity text check (severity in ('low','medium','high')),
  coords jsonb,
  tags text[],
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table finding_media (
  finding_id uuid references findings(id) on delete cascade,
  media_id   uuid references media(id) on delete cascade,
  primary key (finding_id, media_id)
);

create table report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  version int not null,
  inputs_checksum text not null,
  generated_at timestamptz not null default now(),
  pages int,
  bytes int,
  unique(report_id, version)
);

create table events (
  id bigserial primary key,
  report_id uuid,
  kind text,
  data jsonb,
  created_at timestamptz not null default now()
);
