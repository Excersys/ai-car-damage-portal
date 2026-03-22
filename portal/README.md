# Internal portal (damage inspection)

Next.js app and Supabase DB live under this folder.

- **frontend/** — `npm run dev` from `frontend/` after copying `.env.example` to `.env.local`.
- **backend/db/** — schema and seeds for Supabase/Postgres.

Deployment: configure hosting (e.g. Vercel) with **Root Directory** = `portal/frontend` relative to the repository root.
