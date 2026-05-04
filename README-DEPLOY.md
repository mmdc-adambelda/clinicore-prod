# CliniCore EMR — Production Deployment Guide
### Next.js 14 + Supabase + Vercel + Claude AI

---

## What You Have

A fully working EMR system with:
- 🔐 Auth (login / register with email + password)
- 🗄️ PostgreSQL database with Row Level Security (multi-tenant by clinic)
- 📅 Appointments calendar (per-provider, per-chair grid)
- 👤 Patient records (dental + veterinary, searchable)
- 🩺 Clinical workflow (7-step SOAP notes with AI assistant)
- 🦷 Interactive dental chart (FDI 32-tooth, click to update status)
- 🐾 Veterinary records with vaccination tracking
- 💳 Billing & OR generation (payments auto-update invoice balance via DB trigger)
- 📦 Inventory with status alerts (ok / low / critical / out_of_stock)
- 📊 Reports & KPI dashboard with charts
- 🤖 AI clinical assistant (Claude API, suggest SOAP + ICD-10, doctor must accept)
- 📋 RBAC + audit log

---

## Step 1 — Supabase Setup

1. Go to https://supabase.com → **New Project**
2. Name it `clinicore-prod`, choose a region near you (Singapore for PH)
3. Set a strong database password → **Create Project**

### Run the schema

1. In your project → **SQL Editor** → **New query**
2. Paste the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Click **Run** — this creates all tables, triggers, RLS policies, and storage buckets

### Get your API keys

Go to **Settings → API**:
- `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Configure Auth

Go to **Authentication → Settings**:
- Set **Site URL** to your Vercel URL (e.g. `https://clinicore.vercel.app`)
- Under **Email**, disable "Confirm email" for faster testing, or leave enabled for production

---

## Step 2 — Anthropic API Key

1. Go to https://console.anthropic.com
2. **API Keys** → **Create Key**
3. Copy the key — you'll use it as `ANTHROPIC_API_KEY`

---

## Step 3 — GitHub Repository

```bash
# In the clinicore-prod directory:
git init
git add .
git commit -m "Initial production build"
git remote add origin https://github.com/YOUR_USERNAME/clinicore-prod.git
git push -u origin main
```

---

## Step 4 — Vercel Deployment

1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repo (`clinicore-prod`)
3. Framework: **Next.js** (auto-detected)
4. Root directory: `.` (default)

### Add Environment Variables

In Vercel → **Settings → Environment Variables**, add all three:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-ref.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key |
| `ANTHROPIC_API_KEY` | `sk-ant-your-key` |

5. Click **Deploy** → Vercel builds and deploys automatically

### After deploy

- Go back to Supabase → **Authentication → Settings**
- Update **Site URL** to your Vercel production URL
- Add the Vercel URL to **Redirect URLs** too

---

## Step 5 — First Login

1. Visit `https://your-app.vercel.app/register`
2. Fill in your name, email, password, and clinic name
3. You'll be the **Admin** user for that clinic
4. All subsequent staff can be added via Supabase → Authentication → Users, then manually insert a row in `staff_profiles`

---

## File Structure

```
clinicore-prod/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          → Login page
│   │   ├── (auth)/register/       → Register + create clinic
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/         → Stats + schedule overview
│   │   │   ├── appointments/      → Calendar grid
│   │   │   ├── patients/          → Patient list + new patient form
│   │   │   ├── patients/[id]/     → Patient detail + history
│   │   │   ├── clinical/[id]/     → 7-step SOAP workflow + AI
│   │   │   ├── dental/[id]/       → 32-tooth FDI interactive chart
│   │   │   ├── veterinary/        → Pet cards + vaccination status
│   │   │   ├── billing/           → Invoices + OR + payments
│   │   │   ├── inventory/         → Stock levels + reorder alerts
│   │   │   ├── reports/           → Charts + KPIs
│   │   │   └── settings/          → RBAC table + audit log
│   │   └── api/ai/                → Claude API endpoint
│   ├── components/                → All UI components (one per section)
│   ├── lib/
│   │   ├── db.ts                  → All Supabase queries
│   │   ├── utils.ts               → cn(), formatPHP(), formatDate()
│   │   └── supabase/
│   │       ├── client.ts          → Browser client
│   │       └── server.ts          → Server component client
│   └── types/index.ts             → All TypeScript types
├── supabase/migrations/
│   └── 001_initial_schema.sql     → Full PostgreSQL schema
├── middleware.ts                  → Auth session refresh + route guard
├── .env.local.example             → Copy to .env.local
└── README-DEPLOY.md               → This file
```

---

## Adding More Staff

After deploying, to add a doctor or receptionist:

1. **Supabase → Authentication → Users → Invite user** (sends email invite)
2. Once they confirm, go to **Table Editor → staff_profiles → Insert row**:
   - `id`: their auth user UUID (from Authentication → Users)
   - `clinic_id`: your clinic UUID (from `clinics` table)
   - `full_name`: their name
   - `role`: `dentist` / `veterinarian` / `front_desk` / `receptionist`

---

## Auto-Deploy

Every `git push` to `main` triggers a Vercel rebuild. Zero downtime deploys.

---

## Database Backup

Supabase Pro includes daily backups. Free tier: export manually via
**Table Editor → Export** or use `pg_dump` with your connection string.

---

## Support / Customization

- Add SMS reminders via Twilio + Supabase Edge Functions
- Add online booking via a public `/book` route
- Add file upload (X-rays) via `uploadPatientFile()` in `src/lib/db.ts`
- The `ai_suggestions` table stores every AI consultation for review

