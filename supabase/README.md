# HELIOS Supabase

This folder stores database scripts used by HELIOS CM.

## Current mode

Development mode.

RLS policies are permissive for `anon` and `authenticated` roles because the app is currently used locally without full authentication.

## Before production

Replace development policies with role-based access:

- Admin: full access
- IPP / PM: project baseline and approval access
- DL: validation access
- EPC: weekly production access only on assigned projects
