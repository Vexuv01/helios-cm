create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location text,
  region text,
  capacity_dc numeric default 0,
  capacity_ac numeric default 0,
  status text default 'construction',
  planned_cod date,
  forecast_cod date,
  created_at timestamptz default now()
);

create table if not exists public.wbs_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.wbs_activities(id) on delete cascade,
  code text not null,
  name text not null,
  discipline text not null,
  phase text,
  unit text not null default 'unit',
  baseline_quantity numeric not null default 0,
  weight_percent numeric not null default 0,
  planned_start date,
  planned_finish date,
  sort_order int default 0,
  status text default 'not_started',
  created_at timestamptz default now()
);

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  status text not null default 'draft',
  submitted_at timestamptz,
  validated_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz default now(),
  unique(project_id, week_start)
);

create table if not exists public.weekly_entries (
  id uuid primary key default gen_random_uuid(),
  weekly_report_id uuid not null references public.weekly_reports(id) on delete cascade,
  activity_id uuid not null references public.wbs_activities(id) on delete cascade,
  actual_quantity numeric not null default 0,
  notes text,
  created_at timestamptz default now(),
  unique(weekly_report_id, activity_id)
);

create index if not exists idx_wbs_project on public.wbs_activities(project_id);
create index if not exists idx_weekly_project on public.weekly_reports(project_id);
create index if not exists idx_weekly_entries_report on public.weekly_entries(weekly_report_id);
