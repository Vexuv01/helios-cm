-- HELIOS CM Enterprise
-- Development RLS policies
-- These policies allow local/dev usage with Supabase anon key.
-- Before production, replace with role-based policies.

alter table public.projects enable row level security;
alter table public.wbs_activities enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.weekly_entries enable row level security;

drop policy if exists "projects_select_dev" on public.projects;
drop policy if exists "projects_insert_dev" on public.projects;
drop policy if exists "projects_update_dev" on public.projects;
drop policy if exists "projects_delete_dev" on public.projects;

create policy "projects_select_dev"
on public.projects for select
to anon, authenticated
using (true);

create policy "projects_insert_dev"
on public.projects for insert
to anon, authenticated
with check (true);

create policy "projects_update_dev"
on public.projects for update
to anon, authenticated
using (true)
with check (true);

create policy "projects_delete_dev"
on public.projects for delete
to anon, authenticated
using (true);

drop policy if exists "wbs_select_dev" on public.wbs_activities;
drop policy if exists "wbs_insert_dev" on public.wbs_activities;
drop policy if exists "wbs_update_dev" on public.wbs_activities;
drop policy if exists "wbs_delete_dev" on public.wbs_activities;

create policy "wbs_select_dev"
on public.wbs_activities for select
to anon, authenticated
using (true);

create policy "wbs_insert_dev"
on public.wbs_activities for insert
to anon, authenticated
with check (true);

create policy "wbs_update_dev"
on public.wbs_activities for update
to anon, authenticated
using (true)
with check (true);

create policy "wbs_delete_dev"
on public.wbs_activities for delete
to anon, authenticated
using (true);

drop policy if exists "weekly_reports_select_dev" on public.weekly_reports;
drop policy if exists "weekly_reports_insert_dev" on public.weekly_reports;
drop policy if exists "weekly_reports_update_dev" on public.weekly_reports;
drop policy if exists "weekly_reports_delete_dev" on public.weekly_reports;

create policy "weekly_reports_select_dev"
on public.weekly_reports for select
to anon, authenticated
using (true);

create policy "weekly_reports_insert_dev"
on public.weekly_reports for insert
to anon, authenticated
with check (true);

create policy "weekly_reports_update_dev"
on public.weekly_reports for update
to anon, authenticated
using (true)
with check (true);

create policy "weekly_reports_delete_dev"
on public.weekly_reports for delete
to anon, authenticated
using (true);

drop policy if exists "weekly_entries_select_dev" on public.weekly_entries;
drop policy if exists "weekly_entries_insert_dev" on public.weekly_entries;
drop policy if exists "weekly_entries_update_dev" on public.weekly_entries;
drop policy if exists "weekly_entries_delete_dev" on public.weekly_entries;

create policy "weekly_entries_select_dev"
on public.weekly_entries for select
to anon, authenticated
using (true);

create policy "weekly_entries_insert_dev"
on public.weekly_entries for insert
to anon, authenticated
with check (true);

create policy "weekly_entries_update_dev"
on public.weekly_entries for update
to anon, authenticated
using (true)
with check (true);

create policy "weekly_entries_delete_dev"
on public.weekly_entries for delete
to anon, authenticated
using (true);
