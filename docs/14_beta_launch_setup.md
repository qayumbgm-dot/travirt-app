# TraVirt — Beta Launch Setup

**Phase:** Free-tier beta testing → validated → paid production  
**Date:** 2026-06-22

---

## What's Already Ready

| Asset | Status |
|---|---|
| 17 SQL migrations (`001` → `017`) | ✅ Complete |
| `docker-compose.yml` (Postgres 16 + Redis 7 + API) | ✅ Complete |
| `backend/Dockerfile` | ✅ Complete |
| `backend/.env.example` (all env vars documented) | ✅ Complete |
| Health check endpoint at `/health` | ✅ Complete |
| 43 backend unit tests passing | ✅ Complete |
| Frontend + backend TypeScript — zero errors | ✅ Complete |

---

## Launch Task Sequence

1. Set up the Git repository and define the project structure
2. Configure the development and testing environments
3. Create the basic application framework and workflow
4. Integrate the required free tools and services for beta testing
5. Conduct live testing and collect feedback
6. Fix issues and optimize performance
7. Finalize the list of paid subscriptions and services required
8. Purchase and configure the production-ready tools and subscriptions
9. Prepare for production deployment

---

## Free-Tier Infrastructure Stack

| Service | Provider | Free Tier | Purpose |
|---|---|---|---|
| **PostgreSQL** | [Neon](https://neon.tech) | 0.5 GB, serverless | Primary database |
| **Redis** | [Upstash](https://upstash.com) | 10,000 commands/day | Sessions, rate limiting, cache |
| **Backend API** | [Render](https://render.com) | 750 hrs/month (sleeps on idle) | Fastify server |
| **Frontend** | [Vercel](https://vercel.com) | Unlimited static deploys | Vite/React build |
| **Email/SMTP** | [Resend](https://resend.com) | 3,000 emails/month, 100/day | Auth emails, trade confirmations |
| **CI/CD** | GitHub Actions | 2,000 min/month (private repo) | Run vitest on every push |
| **Error tracking** | [Sentry](https://sentry.io) | 5,000 errors/month | Frontend + backend error logging |
| **AI News** | Google Gemini API | 1,500 requests/day | AI news feed feature |

---

## Services Deferred to Production (no free tier needed in beta)

| Service | Reason |
|---|---|
| **Stripe** | No real payments in beta — billing UI shown but purchases disabled |
| **Alice Blue broker API** | Real broker integration — leave ALICE keys blank; all trades stay virtual |
| **Custom domain** | Use free subdomains from Render + Vercel during beta |

---

## Environment Variables

### Backend (set in Render dashboard — never commit)

```env
NODE_ENV=production
PORT=3001

# Neon — copy from Neon dashboard > Connection string
DATABASE_URL=postgresql://...neon.tech/travirt

# Upstash — copy from Upstash dashboard > REST > Redis URL (TLS)
REDIS_URL=rediss://...upstash.io:6379

# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<64-byte hex>
REFRESH_TOKEN_SECRET=<different 64-byte hex>

JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=30

# Vercel frontend URL (set after Vercel deploy)
CORS_ORIGIN=https://travirt.vercel.app

# Google AI Studio — free tier
GEMINI_API_KEY=<from aistudio.google.com>

# Resend dashboard > API Keys
RESEND_API_KEY=<from resend.com>

# Leave blank in beta — enables virtual-only mode
ALICE_USER_ID=
ALICE_API_KEY=
BROKER_ENCRYPTION_KEY=

# Leave blank in beta — billing UI disabled
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=
STRIPE_PRICE_ELITE=
```

### Frontend (set in Vercel dashboard)

```env
# Render backend URL (set after Render deploy)
VITE_API_URL=https://travirt-api.onrender.com
```

---

## Files to Add Before First Deploy

### 1. `.github/workflows/ci.yml` — Run tests on every push
Runs `npx vitest run` against the backend test suite on every push to `main` or any PR.

### 2. `backend/src/database/seed.ts` — Demo user for testers
Creates a demo account (demo@travirt.com / Demo@1234) with ₹10,00,000 virtual balance and a sample portfolio so beta testers can explore without registering.

### 3. `.gitignore` audit — Ensure no secrets are committed
Verify `.env`, `backend/.env`, `*.local`, `node_modules/` are all excluded.

---

## Deployment Sequence (one-time)

1. `git init` → push to GitHub private repo
2. Sign up: Neon → Upstash → Render → Vercel → Resend → Sentry → Google AI Studio
3. Create Neon database → copy `DATABASE_URL`
4. Create Upstash Redis → copy `REDIS_URL`
5. Deploy backend to Render → set all env vars → note the `*.onrender.com` URL
6. Run migrations: `npx ts-node src/database/migrate.ts` via Render shell
7. Run seed: `npx ts-node src/database/seed.ts` via Render shell
8. Deploy frontend to Vercel → set `VITE_API_URL` to Render URL → note the `*.vercel.app` URL
9. Update `CORS_ORIGIN` in Render to the Vercel URL → redeploy backend
10. Smoke test: register → login → place a virtual trade → check portfolio

---

## Production Upgrade Triggers

Move to paid tiers when any of these are hit:

| Metric | Free Limit | Action |
|---|---|---|
| DB storage > 450 MB | Neon 0.5 GB | Upgrade Neon or migrate to Supabase Pro |
| Redis commands > 8,000/day | Upstash 10k/day | Upgrade Upstash Pay-as-you-go |
| Backend always-on required | Render sleeps after 15 min idle | Upgrade Render to Starter ($7/mo) |
| Emails > 80/day | Resend 100/day | Upgrade Resend to Pro ($20/mo) |
| Custom domain needed | — | Purchase domain (~$10/yr) + configure DNS |
| Real broker trades | — | Activate Alice Blue API keys |
| Real payments | — | Activate Stripe live keys |
