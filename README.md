# MetroGreen Process & Management System

Centralized workspace for MetroGreen Technologies Corporation to create,
calculate, revise, approve, and retrieve solar quotations, projects, and
equipment inventory — with strict revision-history integrity and
role-based cost/pricing visibility.

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind**, **Supabase**
(Postgres + Auth + Row-Level Security), deployed on **Vercel**, source on
**GitHub**.

## 1. Backend (already live — no setup needed)

The Supabase project is already built and running:

- Project ref: `qrcrwkgijvimfpcrgjrf`
- URL: `https://qrcrwkgijvimfpcrgjrf.supabase.co`
- 16 migrations already applied: full schema, RLS policies, business-logic
  functions (`app.*` schema), and guard triggers protecting draft-only
  editability and append-only revision/price history.

You do not need to run any migrations. If you ever need to inspect or
extend the schema, do it through the Supabase dashboard/CLI for this
project — do not point the app at a different project.

## 2. Local setup

```bash
npm install
cp .env.local.example .env.local
# .env.local needs:
#   NEXT_PUBLIC_SUPABASE_URL=https://qrcrwkgijvimfpcrgjrf.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<the publishable key — ask your session or the Supabase dashboard: Project Settings → API>
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

## 3. Logging in

Four test accounts already exist in Supabase Auth, one per role. Password
for all four has been set to:

```
MetroGreen2026!
```

| Role | Email |
|---|---|
| Administrator | admin@metrogreentest.local |
| Sales | sales@metrogreentest.local |
| Engineer | engineer@metrogreentest.local |
| Management | management@metrogreentest.local |

**Change these passwords (or replace these accounts with real staff
accounts) before using this with real company data.** These are
`.local` placeholder addresses meant only for first login/testing —
create real user accounts (Supabase Auth → Users, or your own sign-up
flow) for actual staff, and assign their role via the `user_roles` table.

> Note: there is currently no in-app screen for creating users or
> assigning roles — that has to be done directly in Supabase (Auth →
> Users to create the account, then an insert into `user_roles` to
> assign administrator / management / sales / engineer / procurement /
> viewer). Adding an in-app user-management screen is a good next
> iteration.

## 4. Deploying

1. **GitHub**: push this repository to a new GitHub repo.
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin master
   ```
2. **Vercel**: import the GitHub repo in Vercel ("New Project" →
   select the repo). Vercel will detect Next.js automatically.
3. **Environment variables** (Vercel → Project Settings →
   Environment Variables), same two as `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. No database migration step is needed — the backend is
   already live.

## 5. What's implemented

- **Customers** — CRUD, sites, contacts.
- **Equipment catalog** — categorized, current pricing with staleness
  badges, append-only price history (`app.set_equipment_price`).
- **Quotations & revisions** — create quotation → draft revision →
  edit system configuration, BOM, costing, pricing → recalculate
  engineering (generation, savings, payback, NPV, IRR, LCOE) →
  submit → approve/reject → new revisions are immutable snapshots
  once superseded (enforced by DB triggers, not just the UI).
  Cost and margin are only ever visible to roles the database itself
  authorizes (`can_see_cost`, `can_see_profit`) — this is enforced by
  Row-Level Security, so the UI-level checks in `src/lib/roles.ts` are
  a convenience, not the real boundary.
- **Customer-facing document view** (`/quotations/[id]/document`) —
  print-friendly, selling price only, never shows cost.
- **Projects** — created from an approved revision; BOM is frozen as a
  baseline at that point (DB-trigger guarded); milestones, team
  assignments, status.
- **Settings** — business assumptions (VAT, performance ratio, PSH,
  margin floor, discount rate, emission factor, etc.), editable by
  administrator/management only.

## 6. Known gaps / suggested next steps

- No in-app user/role management (see §3).
- The engineering calculation engine (`src/lib/calc-engine.ts`) is a
  first working implementation of NPV/IRR/LCOE/payback/generation —
  worth a review against your actual engineering methodology before
  relying on it for client-facing numbers.
- This code has not been run through `npm install` / `npm run build`
  in this environment (no package-registry network access here) — it
  has only been checked with the TypeScript compiler against the
  source files themselves. Run `npm install && npm run build` locally
  or let Vercel's first deploy surface anything that needs fixing.
- Consider tightening the placeholder `.local` test accounts (delete
  or repurpose them) once real staff accounts exist.
