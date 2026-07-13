alter table public.executive_weekly_notes
  add column if not exists achievement_items jsonb not null default '[]'::jsonb,
  add column if not exists challenge_items jsonb not null default '[]'::jsonb,
  add column if not exists risk_items jsonb not null default '[]'::jsonb,
  add column if not exists management_request_items jsonb not null default '[]'::jsonb,
  add column if not exists next_week_items jsonb not null default '[]'::jsonb;

alter table public.executive_weekly_notes
  drop constraint if exists executive_weekly_notes_achievement_items_array,
  drop constraint if exists executive_weekly_notes_challenge_items_array,
  drop constraint if exists executive_weekly_notes_risk_items_array,
  drop constraint if exists executive_weekly_notes_management_request_items_array,
  drop constraint if exists executive_weekly_notes_next_week_items_array;

alter table public.executive_weekly_notes
  add constraint executive_weekly_notes_achievement_items_array
    check (jsonb_typeof(achievement_items) = 'array'),
  add constraint executive_weekly_notes_challenge_items_array
    check (jsonb_typeof(challenge_items) = 'array'),
  add constraint executive_weekly_notes_risk_items_array
    check (jsonb_typeof(risk_items) = 'array'),
  add constraint executive_weekly_notes_management_request_items_array
    check (jsonb_typeof(management_request_items) = 'array'),
  add constraint executive_weekly_notes_next_week_items_array
    check (jsonb_typeof(next_week_items) = 'array');
