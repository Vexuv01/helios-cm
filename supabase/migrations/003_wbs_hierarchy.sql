alter table public.wbs_activities
add column if not exists level integer default 3,
add column if not exists is_group boolean default false,
add column if not exists path text default '';

update public.wbs_activities
set
  level = coalesce(level, 3),
  is_group = coalesce(is_group, false),
  path = coalesce(nullif(path, ''), discipline || '/' || code)
where true;
