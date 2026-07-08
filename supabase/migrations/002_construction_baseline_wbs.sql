alter table public.wbs_activities
add column if not exists area text default '',
add column if not exists sub_area text default '',
add column if not exists system text default '',
add column if not exists contractor text default '',
add column if not exists actual_start date,
add column if not exists actual_finish date,
add column if not exists duration_days integer default 0,
add column if not exists milestone boolean default false,
add column if not exists remarks text default '';

update public.wbs_activities
set duration_days =
  case
    when planned_start is not null and planned_finish is not null
    then greatest((planned_finish::date - planned_start::date), 0)
    else 0
  end
where duration_days is null or duration_days = 0;
