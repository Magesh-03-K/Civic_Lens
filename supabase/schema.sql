create extension if not exists pgcrypto;

create table departments (
  id serial primary key,
  slug text unique not null,
  name text not null,
  categories text[] not null,
  email text not null
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  ticket_id text unique not null,
  category text not null,
  sub_type text,
  title text not null,
  summary text not null,
  user_text text,
  lat double precision not null,
  lng double precision not null,
  address text,
  media_path text,
  media_type text check (media_type in ('image','video','audio')),
  factor_scores jsonb not null,
  ai_used boolean not null default true,
  ai_confidence real,
  needs_human_review boolean not null default false,
  status text not null default 'submitted'
    check (status in ('submitted','routed','in_progress','resolved')),
  department_id int references departments(id),
  report_count int not null default 1,
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  sla_due_at timestamptz not null,
  resolved_at timestamptz
);
create index reports_geo_idx on reports (lat, lng);
create index reports_status_idx on reports (status);
create index reports_created_idx on reports (created_at desc);

create table report_media (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  path text not null,
  media_type text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table status_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  status text not null,
  actor text not null check (actor in ('citizen','system','authority')),
  note text,
  created_at timestamptz not null default now()
);

create table resolutions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  after_path text not null,
  same_location boolean,
  issue_resolved boolean,
  confidence real,
  reason text,
  ai_verdict text not null check (ai_verdict in ('resolved','needs_review')),
  human_override boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create table dispatches (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  department_id int references departments(id),
  to_email text not null,
  subject text not null,
  body text not null,
  simulated boolean not null default true,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

alter table departments enable row level security;
alter table reports enable row level security;
alter table report_media enable row level security;
alter table status_events enable row level security;
alter table resolutions enable row level security;
alter table dispatches enable row level security;

insert into departments (slug, name, categories, email) values
 ('roads','Madurai Corporation – Roads & Engineering','{pothole_damaged_road}','roads@civiclens.invalid'),
 ('water','Water Supply & Drainage (TWAD / Corporation)','{water_leak,sewage_overflow,open_manhole_drain}','water@civiclens.invalid'),
 ('swm','Solid Waste Management – Madurai Corporation','{garbage_dumping}','swm@civiclens.invalid'),
 ('pcb','Tamil Nadu Pollution Control Board','{air_pollution,water_pollution,noise_pollution}','pcb@civiclens.invalid'),
 ('elec','Tamil Nadu Electricity Board','{streetlight_electrical}','elec@civiclens.invalid'),
 ('general','Madurai Corporation – General Grievance Cell','{other}','general@civiclens.invalid');
