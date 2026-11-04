-- Schema voor de Sales Co-pilot-demo. Volgt de namen van Central waar die al bestaan
-- (meetings, meeting_segments) en voegt de co-pilot-tabellen uit de bouwspec toe.

create table if not exists companies (
  id text primary key,
  name text not null,
  vat text,
  city text,
  domain text,
  sector text
);

create table if not exists deals (
  id text primary key,
  company_id text not null references companies(id),
  title text not null,
  stage text not null,
  amount numeric
);

create table if not exists meetings (
  id text primary key,
  title text not null,
  kind text not null check (kind in ('sales', 'general', 'internal', 'kickoff')),
  capture text not null check (capture in ('mic', 'mic_system')),
  started_at timestamptz not null,
  duration_min integer not null,
  status text not null check (status in ('planned', 'recording', 'ready')),
  company_id text references companies(id),
  deal_id text references deals(id),
  participants jsonb not null default '[]',
  summary text
);

-- Wat de Lead Engine over een bedrijf weet. Verhuist op termijn naar Central.
create table if not exists lead_engine (
  company_id text primary key references companies(id),
  status text not null check (status in ('identified', 'enriching', 'enriched')),
  icp_score integer,
  icp_confidence real,
  fte integer,
  revenue_eur numeric,
  gross_margin_eur numeric,
  signals jsonb not null default '[]',
  leadinfo jsonb,
  web jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists meeting_segments (
  meeting_id text not null references meetings(id) on delete cascade,
  seq integer not null,
  start_ms integer not null,
  end_ms integer not null,
  utterances jsonb not null,
  primary key (meeting_id, seq)
);

create table if not exists copilot (
  meeting_id text primary key references meetings(id) on delete cascade,
  briefing jsonb,
  debrief jsonb
);

create table if not exists copilot_updates (
  meeting_id text not null references meetings(id) on delete cascade,
  seq integer not null,
  t integer not null,
  payload jsonb not null,
  source text not null,
  latency_ms integer not null,
  created_at timestamptz not null default now(),
  primary key (meeting_id, seq)
);

create table if not exists copilot_feedback (
  id bigint generated always as identity primary key,
  meeting_id text not null references meetings(id) on delete cascade,
  suggestion_id text not null,
  action text not null check (action in ('gesteld', 'niet_relevant')),
  created_at timestamptz not null default now()
);

-- De app praat enkel server-side met de service-role-sleutel. Zet RLS aan zodat de
-- anon-sleutel niets kan lezen.
alter table companies enable row level security;
alter table deals enable row level security;
alter table meetings enable row level security;
alter table lead_engine enable row level security;
alter table meeting_segments enable row level security;
alter table copilot enable row level security;
alter table copilot_updates enable row level security;
alter table copilot_feedback enable row level security;
