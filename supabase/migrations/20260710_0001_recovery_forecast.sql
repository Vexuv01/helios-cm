create table if not exists public.wbs_recovery_forecasts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  wbs_activity_id uuid not null references public.wbs_activities(id) on delete cascade,
  forecast_start date,
  forecast_finish date,
  forecast_note text,
  status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, wbs_activity_id)
);

create index if not exists idx_wbs_recovery_forecasts_project_id
on public.wbs_recovery_forecasts(project_id);

create index if not exists idx_wbs_recovery_forecasts_activity_id
on public.wbs_recovery_forecasts(wbs_activity_id);
