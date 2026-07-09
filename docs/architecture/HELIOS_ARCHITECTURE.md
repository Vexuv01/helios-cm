# HELIOS CM Enterprise Architecture

HELIOS CM Enterprise is a Construction Management platform for IPP photovoltaic and agrivoltaic projects.

## Core Principle

All operational progress, analytics, deviations, forecasts and dashboard KPIs must be calculated from:

1. WBS Baseline
2. Weekly Actual Production

No strategic construction KPI should be hardcoded in React components.

## Main Modules

- Portfolio
- Project Control Room
- WBS Planning
- Weekly Production
- Documents
- Photos
- Analytics
- Future: Auth, Roles, RLS, Mobile

## Data Source

Supabase is the system of record.

Main tables:

- projects
- wbs_activities
- weekly_reports
- weekly_entries
- construction_documents
- construction_photos
- profiles
