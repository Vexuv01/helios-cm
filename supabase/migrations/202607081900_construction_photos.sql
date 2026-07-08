create table if not exists construction_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  wbs_activity_id uuid references wbs_activities(id) on delete set null,
  weekly_report_id uuid references weekly_reports(id) on delete set null,
  file_path text not null,
  file_name text,
  description text,
  taken_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table construction_photos enable row level security;

create policy "construction_photos_select_all"
on construction_photos for select
using (true);

create policy "construction_photos_insert_all"
on construction_photos for insert
with check (true);

create policy "construction_photos_update_all"
on construction_photos for update
using (true)
with check (true);

create policy "construction_photos_delete_all"
on construction_photos for delete
using (true);
