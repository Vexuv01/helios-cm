create table if not exists construction_documents (
    id uuid primary key default gen_random_uuid(),

    project_id uuid not null references projects(id) on delete cascade,
    wbs_activity_id uuid references wbs_activities(id) on delete cascade,
    weekly_report_id uuid references weekly_reports(id) on delete set null,

    category text not null default 'OTHER',
    version integer not null default 1,

    title text not null,
    description text,

    file_name text not null,
    file_path text not null,

    mime_type text,
    size_bytes bigint,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_documents_project
on construction_documents(project_id);

create index if not exists idx_documents_activity
on construction_documents(wbs_activity_id);

create index if not exists idx_documents_weekly
on construction_documents(weekly_report_id);

alter table construction_documents disable row level security;
