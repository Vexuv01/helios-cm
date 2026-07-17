create table if not exists public.cash_flow_events (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  payment_date date not null,
  amount numeric(16, 2) not null,

  category text,
  detail text,
  description text,

  ordering_party text,
  recipient text,
  iban text,
  notes text,

  source_row_key text,

  created_by uuid
    references auth.users(id)
    on delete set null
    default auth.uid(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cash_flow_events_amount_non_negative
    check (amount >= 0)
);

create index if not exists idx_cash_flow_events_project_id
  on public.cash_flow_events(project_id);

create index if not exists idx_cash_flow_events_payment_date
  on public.cash_flow_events(payment_date);

create index if not exists idx_cash_flow_events_project_payment_date
  on public.cash_flow_events(project_id, payment_date);

create unique index if not exists idx_cash_flow_events_source_row
  on public.cash_flow_events(project_id, source_row_key)
  where source_row_key is not null;

alter table public.cash_flow_events enable row level security;

drop policy if exists "cash_flow_events_select_authenticated"
  on public.cash_flow_events;

create policy "cash_flow_events_select_authenticated"
  on public.cash_flow_events
  for select
  to authenticated
  using (true);

drop policy if exists "cash_flow_events_insert_authenticated"
  on public.cash_flow_events;

create policy "cash_flow_events_insert_authenticated"
  on public.cash_flow_events
  for insert
  to authenticated
  with check (true);

drop policy if exists "cash_flow_events_update_authenticated"
  on public.cash_flow_events;

create policy "cash_flow_events_update_authenticated"
  on public.cash_flow_events
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "cash_flow_events_delete_authenticated"
  on public.cash_flow_events;

create policy "cash_flow_events_delete_authenticated"
  on public.cash_flow_events
  for delete
  to authenticated
  using (true);
