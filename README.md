# PGM Performance Dashboard

Private, password-protected reporting dashboard for Pure Golf Media golf club clients. Each client logs in and sees only their own GA4 and Meta Ads performance data. The PGM admin account can manage all clients and view any client's dashboard.

**Stack:** Next.js 14 (App Router) · NextAuth.js v5 · PostgreSQL (Prisma v7) · Tailwind CSS · Recharts

---

## Local setup

### Prerequisites

- Node.js 20+ (install via [nvm](https://github.com/nvm-sh/nvm))
- A PostgreSQL database — [Neon](https://neon.tech) free tier works perfectly

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | How to get it |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `DATABASE_URL` | Neon connection string (Settings → Connection string) |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `SEED_ADMIN_PASSWORD` | Choose a strong password — change after first login |

### 3. Set up the database

```bash
# Run migrations
npx prisma migrate dev

# Seed admin user + demo client
npm run db:seed
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## Default credentials (after seeding)

| Account | Username | Password |
|---|---|---|
| PGM Admin | `pgm-admin` | value of `SEED_ADMIN_PASSWORD` |
| Demo client | `demo-golf-club` | `demo-password-change-me` |

> The demo client account has `passwordResetRequired = true` — it will prompt for a password change on first login.

---

## Adding a real client

1. Log in as `pgm-admin` and go to **Admin → + New client**
2. Enter the club name, slug, and temporary login credentials
3. Click **Edit** on the new client and configure:

**GA4 setup:**
- Create a GCP Service Account for PGM (one account, used for all clients)
- In each client's GA4 property → Admin → Account Access Management → add the service account email as **Viewer**
- Paste the GA4 **Property ID** (Admin → Property Settings) and the full **Service Account JSON key** into the client config
- Set the **Booking event name** (default: `generate_lead`) to match the GA4 event you're tracking as a booking start

**Meta Ads setup:**
- In Meta Business Manager → System Users → generate a token with `ads_read` permission
- Grant the system user access to the client's ad account
- Paste the **Ad Account ID** (numbers only, no `act_` prefix) and the **System User Access Token**

**Mailchimp setup:**
- In the client's Mailchimp account → Account → Extras → API keys → create a key
- Paste the **API Key** exactly as given, including the `-usXX` suffix (that's the datacenter, e.g. `-us21`) — the app parses it from the key
- Find the **Audience ID** under Audience → Settings → Audience name and defaults, and paste it in
- If both Mailchimp and Email Octopus are configured for a client, Mailchimp takes priority

4. Click **Save config**, then **View dashboard →** to verify live data is loading

---

## Useful commands

```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm run db:migrate   # Run pending Prisma migrations
npm run db:seed      # Seed admin + demo client
npm run db:studio    # Open Prisma Studio (database GUI)
npx tsc --noEmit    # TypeScript type check
```

---

## Project structure

```
src/
├── app/
│   ├── (auth)/login/       # Login page
│   ├── dashboard/          # Client dashboard (overview + nav pages)
│   ├── admin/              # Admin panel (client management)
│   └── api/
│       ├── auth/           # NextAuth route handler
│       ├── dashboard/      # Data API routes (GA4 + Meta, cached)
│       └── admin/          # Admin API routes (client CRUD)
├── components/
│   ├── layout/             # Sidebar, DashboardHeader
│   ├── dashboard/          # MetricCard, charts, table, placeholders
│   └── ui/                 # Button, Input
└── lib/
    ├── auth.ts             # NextAuth config (credentials provider)
    ├── prisma.ts           # Prisma client singleton
    ├── ga4.ts              # Google Analytics Data API wrapper
    ├── meta.ts             # Meta Marketing API wrapper
    ├── cache.ts            # In-memory LRU cache (5-min TTL)
    ├── crypto.ts           # AES-256-GCM encrypt/decrypt for stored tokens
    └── utils.ts            # Formatters, % change calc, date helpers
```

---

## Security notes

- Passwords hashed with bcrypt (cost factor 12)
- All API tokens (GA4 service account JSON, Meta access token) encrypted AES-256-GCM at rest
- `ENCRYPTION_KEY` and `AUTH_SECRET` must never be committed — `.env.local` is gitignored
- Every `/api/dashboard/*` route validates `session.user.clientId === requestedClientId`
- Every `/api/admin/*` route validates `session.user.role === 'ADMIN'`
- GA4 service account has Viewer role only — no write access possible
- Meta token scope: `ads_read` only — no campaign modification possible

---

## Deployment (Vercel)

1. Push the repo to GitHub
2. Import into Vercel
3. Add all environment variables from `.env.local` to the Vercel project settings
4. Deploy — Vercel runs `prisma generate` automatically via the build step

> For multi-instance deployments (Vercel Edge, horizontal scaling), swap the in-memory LRU cache in `src/lib/cache.ts` for Redis (Upstash). The interface is abstracted — only that one file needs changing.
