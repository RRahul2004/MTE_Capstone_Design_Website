# MTE Capstone — Design Log

Public design record for the MTE Capstone robotics project: ideation posts, a research
shelf, a dated progress log, weekly meeting minutes, and course deliverables — with
markdown, file attachments, cross-references, and comments.

## Stack
- **Next.js 14** (App Router) + TypeScript
- **Supabase** — Postgres, auth, and file storage
- **Framer Motion** for transitions
- Hand-rolled markdown renderer (`lib/markdown.tsx`) — no runtime dependency

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `TEAM_INVITE_CODE` | Shared code required to create an account |
| `TEAM_EMAILS` | Comma-separated allowlist of team emails |

`.env*` is gitignored — never commit real keys.

### Database

Run `supabase/schema.sql` once in the Supabase SQL editor. It is idempotent and
contains everything (tables, columns, RLS policies, functions, storage bucket).
The other files in `supabase/` are targeted migrations and maintenance scripts.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm test` | Unit tests (node:test) |
| `npm run typecheck` | `tsc --noEmit` |

## Deploying

Hosted on Vercel. Push to `main`, then set the four environment variables in
**Vercel → Settings → Environment Variables**, and add the deployed URL to
**Supabase → Authentication → URL Configuration** (Site URL + Redirect URLs).
