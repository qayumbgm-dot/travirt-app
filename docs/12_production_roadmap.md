# TraVirt — Production Readiness Roadmap
**Gap Analysis & Implementation Blueprint**
Version 1.0 · 2026-06-21

---

## Executive Summary

TraVirt v9 is a fully client-side React SPA. It is a sophisticated UI prototype with zero server infrastructure. Every piece of state — portfolios, balances, orders, watchlists, user identity — lives in browser memory and resets on page reload. Credentials are hardcoded. Authentication is simulated. API keys are embedded in the JavaScript bundle.

The gap between the current state and a production SaaS platform serving thousands of subscribers is complete: every layer of the stack must be built from scratch, though the frontend UI components are high-quality and largely reusable.

---

## Phase 1: Production Readiness Assessment — Current State Audit

### What Exists Today

| Layer | Current Reality |
|---|---|
| Frontend UI | React 18 SPA, Vite, TypeScript, Tailwind. Rich, polished UI. |
| Backend | None. Zero server code. |
| Database | None. localStorage only (clears on browser wipe). |
| Authentication | Fake. Accepts any User ID / password. No validation. |
| Session management | None. Username stored in React state. |
| Market data | Mock interval + optional Alice Blue WebSocket (browser-direct, CORS-blocked). |
| Portfolio state | In-memory React context. Lost on refresh. |
| Watchlist state | localStorage per browser. Not synced across devices. |
| API keys | `VITE_API_KEY` (Gemini), `VITE_ALICE_USER_ID`, `VITE_ALICE_API_KEY` — all embedded in the built JS bundle and publicly visible. |
| Multi-tenancy | None. One hardcoded user (`TRDR001`). |
| Payments | None. |
| Admin panel | None. |
| Monitoring | None. |
| Security | None. |
| CI/CD | `npm run build` only. |

---

### Backend Assessment

#### Components Suitable for Production (none currently exist — these are design patterns to port)
- The `Order`, `Position`, `GTTOrder`, `Alert`, `PortfolioState` type definitions in `types.ts` are well-designed and map cleanly to database schema.
- The execution logic in `PortfolioContext.tsx` (average price calculation, position tracking) is sound and can be ported to server-side trade engine.
- The GTT/Alert triggering pattern (compare LTP against trigger) is implementable as a background job.

#### Critical Missing Backend Services
1. **Authentication service** — no real auth exists
2. **User management service** — no user records
3. **Portfolio persistence service** — state is memory-only
4. **Market data relay service** — broker WebSocket to browser relay
5. **Trade execution engine** — currently runs in browser
6. **GTT/Alert monitoring engine** — no background processing
7. **Subscription/billing service** — none
8. **Admin service** — none
9. **Notification delivery service** — in-app only, no email/push
10. **AI proxy service** — Gemini key exposed in browser bundle

#### Security Vulnerabilities (Critical)
- `VITE_GEMINI_API_KEY` embedded in built JS — publicly extractable from browser DevTools
- `VITE_ALICE_USER_ID` and `VITE_ALICE_API_KEY` embedded in built JS — broker account compromisable
- No authentication validation — any string logs in
- No HTTPS enforcement
- No CSRF protection
- No rate limiting on any operation
- No input sanitization (XSS vectors in symbol/name display)
- localStorage portfolio data modifiable by any script on page
- No audit logging
- No session expiry

#### Scalability Limitations
- Zero horizontal scalability — no server to scale
- All computation in browser — degrades on low-end devices
- Market data simulation runs `setInterval` in browser — CPU-bound per tab
- No caching layer
- No CDN
- localStorage cap at ~5MB per origin — will hit limit with large order history

#### Data Architecture Problems
- Portfolio resets on hard refresh (state only in React)
- Watchlist in localStorage — not synced across devices/browsers
- Leaderboard peer data is hardcoded `PEERS` array in `LeaderboardScreen.tsx`
- Daily bonus `claimed` flag resets on refresh
- No trade audit trail — orders only in memory

---

### Frontend Assessment

#### Components Suitable for Production (high quality, reuse as-is)
- `components/trade/ChartPanel.tsx` — TradingView Lightweight Charts integration
- `components/trade/OptionChainPanel.tsx` — full option chain UI
- `components/trade/OrderWindow.tsx` — order form with bracket/GTT/alert support
- `components/trade/WatchlistPanel.tsx` — watchlist sidebar with groups
- `components/trade/MarketDepthModal.tsx` — L2 market depth display
- `components/layout/WebHeader.tsx` — nav header with index ticker
- `screens/DashboardScreen.tsx` — overview dashboard
- `screens/PortfolioScreen.tsx` — portfolio P&L view
- `screens/OrdersScreen.tsx` / `PositionsScreen.tsx` — order and position tables
- `screens/LeaderboardScreen.tsx` — leaderboard (needs real data API)
- `screens/AINewsScreen.tsx` — AI news (needs backend proxy for Gemini)
- `screens/SettingsScreen.tsx` / `SupportScreen.tsx` — just built
- `screens/TradeScreen.tsx` — main trading workspace

#### Components Requiring Refactoring
- `contexts/PortfolioContext.tsx` — replace in-memory state with API calls to backend
- `contexts/WatchlistContext.tsx` — replace localStorage with backend API
- `hooks/useMarketData.ts` — replace browser-direct WebSocket with backend relay
- `screens/auth/WebLoginScreen.tsx` — replace fake login with real auth API
- `screens/auth/WebSignUpScreen.tsx` — replace simulated signup with real registration
- `screens/ProfileScreen.tsx` — replace localStorage profile with user API

#### State Management Architecture Problems
- All state in React Context — suitable for UI state only, not persistent data
- No optimistic update strategy for API-backed operations
- No error boundary strategy for API failures
- No loading state standardization across screens
- No offline detection or graceful degradation

#### Performance Gaps
- No code splitting (entire app loads as one bundle)
- No lazy loading of screens
- No memoization audit on re-render-heavy components (StockRow, WatchlistPanel)
- Chart library loaded eagerly even when not viewing trade screen
- No image optimization pipeline

#### Accessibility Gaps
- No ARIA labels on icon-only buttons
- No keyboard navigation testing
- Color-only indicators (green/red P&L) without text alternatives
- No focus management on modal open/close
- No skip-to-content link

---

## Phase 2: Internet Deployment Architecture

### Recommended Stack

**Backend:** Node.js (Fastify or Express) + TypeScript
**Database:** PostgreSQL (primary) + Redis (cache/sessions/queues)
**Real-time:** WebSocket server (ws or Socket.IO) on backend
**Queue:** BullMQ (Redis-backed)
**Auth:** JWT (access + refresh token pattern)
**AI Proxy:** Server-side Gemini calls (key never leaves server)
**Hosting:** Railway, Render, Fly.io, or AWS (ECS/Fargate)
**Frontend CDN:** Vercel, Netlify, or Cloudflare Pages
**Domain:** Cloudflare DNS + WAF + DDoS protection
**Secrets:** Environment variables + Vault (HashiCorp or Doppler)

### Domain & DNS
```
travirt.com          → Cloudflare → Frontend CDN (static)
api.travirt.com      → Cloudflare → Backend API server(s)
ws.travirt.com       → Cloudflare → WebSocket server
admin.travirt.com    → Cloudflare → Admin portal (IP-restricted)
cdn.travirt.com      → Cloudflare CDN → Static assets
```

### HTTPS/SSL
- Cloudflare terminates TLS — free wildcard cert
- HSTS header on all responses
- HTTP → HTTPS redirect enforced at Cloudflare level
- HSTS preload submitted

### Reverse Proxy / API Gateway
- Nginx in front of Node.js API servers
- Rate limiting at Nginx level (burst allowance per IP)
- Request ID injection for tracing
- Response compression (gzip/brotli)
- Cloudflare WAF rules for OWASP top 10

---

## Phase 3: Scalability & Request Absorption Layer

### Backend Scalability Architecture

```
Internet
   │
[Cloudflare WAF + DDoS]
   │
[Load Balancer — Nginx / Cloudflare Load Balancing]
   │         │         │
[API-1]  [API-2]  [API-3]   ← Stateless Node.js replicas
   │
[Redis Cluster]    [PostgreSQL Primary + Read Replicas]
   │
[BullMQ Workers]   ← Background job processors (separate process)
   │
[External Services: Broker WS, Gemini API, Payment Gateway]
```

**Key Scaling Decisions:**

| Concern | Solution |
|---|---|
| Sudden traffic spikes | Cloudflare absorbs at edge; auto-scale API pods |
| WebSocket connections | Dedicated WS server with Redis pub/sub for fan-out |
| Trade execution | Queue-based (BullMQ) — never synchronous under load |
| Market data fan-out | Single broker connection → Redis pub/sub → all subscribers |
| Database read load | Read replicas for portfolio queries; write to primary |
| Session state | Redis (not JWT payload) — allows instant revocation |
| Rate limiting | Per-user token bucket in Redis |
| Circuit breakers | `opossum` library wrapping broker API and Gemini calls |

### Market Data Fan-Out Architecture (Critical)
```
[Broker WebSocket — Alice Blue / Zerodha]
        │  (one persistent connection, server-side)
[Market Data Relay Service]
        │  (normalizes ticks → canonical format)
[Redis Pub/Sub channel per symbol]
        │  (fan-out to all subscribers watching that symbol)
[WebSocket Server]
        │  (delivers ticks to browser WS connections)
[Browser]
```
This replaces the current broken pattern (each browser tab attempts its own broker WebSocket connection — CORS-blocked and credential-exposing).

### Frontend Scalability

- **Code splitting:** `React.lazy()` + `Suspense` on every `screen/` import in App.tsx
- **Route-based chunking:** Each screen becomes a separate JS chunk (Vite `manualChunks`)
- **Chart library lazy load:** `lightweight-charts` only loaded when TradeScreen is active
- **WebSocket connection pooling:** One shared WS connection per browser tab via a singleton service
- **Subscription delta:** Client sends list of watched symbols; server sends only relevant ticks (not full market broadcast)
- **Virtualized lists:** `react-window` for watchlist rows, order history tables with 1000+ entries
- **Debounced market tick rendering:** Aggregate ticks at 250ms intervals before React state update — prevents per-tick re-render storms

---

## Phase 4: Multi-Tenant Subscriber Architecture

### Database Schema (PostgreSQL)

```sql
-- Core tenant tables
users (id, email, password_hash, role, subscription_tier, created_at, last_login)
sessions (id, user_id, refresh_token_hash, expires_at, ip, user_agent)
subscriptions (id, user_id, plan, status, start_date, end_date, payment_ref)

-- Per-user portfolio (replaces PortfolioContext in-memory)
portfolio_balances (user_id, inr_balance, nxo_balance, virtual_balance, updated_at)
positions (id, user_id, symbol, exchange, quantity, avg_price, created_at)
orders (id, user_id, symbol, exchange, quantity, price, order_type, transaction_type, status, timestamp)
gtt_orders (id, user_id, symbol, trigger_price, status, ...)
alerts (id, user_id, symbol, property, operator, value, status, ...)
transactions (id, user_id, type, description, amount, timestamp)

-- Watchlist (replaces WatchlistContext localStorage)
watchlists (id, user_id, name, created_at)
watchlist_groups (id, watchlist_id, name, color, sort_order, is_collapsed)
watchlist_group_symbols (group_id, symbol_key, sort_order)
watchlist_settings (watchlist_id, settings_json)

-- Admin
audit_log (id, user_id, action, resource, detail_json, ip, timestamp)
support_tickets (id, user_id, subject, status, created_at)
support_messages (id, ticket_id, sender, body, timestamp)
```

### Authentication Flow (Real Implementation)

```
POST /api/auth/register  → hash password (bcrypt) → insert user → send verification email → return 201
POST /api/auth/login     → verify password → issue access_token (15min JWT) + refresh_token (30d, httpOnly cookie)
POST /api/auth/refresh   → validate refresh_token → issue new access_token
POST /api/auth/logout    → invalidate refresh_token in DB → clear cookie
POST /api/auth/verify-email → mark email verified
POST /api/auth/forgot-password → send reset email
POST /api/auth/reset-password → verify token → update hash
```

### Role-Based Access Control (RBAC)

| Role | Access |
|---|---|
| `guest` | Landing, pricing, public pages only |
| `subscriber_trial` | Full trading, 14-day trial, limited AI calls |
| `subscriber_basic` | Full trading, standard AI quota |
| `subscriber_pro` | Full trading, higher AI quota, advanced analytics |
| `admin` | Admin portal, all users, all data |
| `super_admin` | Admin + system config, secret rotation |

Middleware: `requireAuth(role)` decorator on every protected route.

### Data Isolation Guarantee
- Every database query for user-owned data MUST include `WHERE user_id = req.user.id`
- No cross-user data leakage is possible by design — queries never accept `user_id` from request body
- Row-level security (RLS) enabled in PostgreSQL as secondary defense
- API tests must assert 403 when user A tries to access user B's data

---

## Phase 5: Privacy & Security Framework

### Secrets Management
```
Never in code. Never in Git. Never in VITE_ prefix (exposes to browser).

Server-side only:
- GEMINI_API_KEY
- DATABASE_URL
- REDIS_URL
- JWT_SECRET
- REFRESH_TOKEN_SECRET
- STRIPE_SECRET_KEY
- BROKER_API_KEY / BROKER_USER_ID
- SMTP credentials

Tool: Doppler (recommended) or AWS Secrets Manager
Pattern: Secrets injected as environment variables at runtime, not build time
```

### Security Headers (all responses)
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{NONCE}'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### API Security
- All endpoints require JWT (except auth routes)
- Rate limiting: 100 req/min per user (Redis token bucket), 20 req/min on auth routes
- Input validation: `zod` schema validation on every request body
- SQL injection: Parameterized queries only (via `pg` or `drizzle-orm`)
- XSS: `DOMPurify` on any user-provided text rendered in DOM; `helmet` on API
- CSRF: `SameSite=Strict` on refresh token cookie; `csrf-csrf` middleware on state-changing routes

### Encryption
- Passwords: `bcrypt` (cost factor 12)
- Refresh tokens: random 64-byte token → stored as SHA-256 hash only
- Sensitive DB fields at rest: PostgreSQL `pgcrypto` for PAN, bank account numbers
- All data in transit: TLS 1.2+ (Cloudflare enforces)
- Backups: AES-256 encrypted before upload to S3

### Frontend Security Fixes Required
- Remove ALL `VITE_*` API keys from frontend
- All external API calls (Gemini, broker) must go through `/api/proxy/*` backend routes
- Replace `localStorage` portfolio state with API calls
- Add `DOMPurify` for any content that might contain user input rendered as HTML
- Implement Content Security Policy nonce on script tags
- Add React error boundaries around all major screen sections

### Audit Logging
Every write operation must be logged:
```
audit_log: { user_id, action='ORDER_PLACED', resource='orders', detail={symbol, qty, price}, ip, timestamp }
audit_log: { user_id, action='PASSWORD_CHANGED', resource='users', detail={}, ip, timestamp }
audit_log: { user_id, action='WATCHLIST_MODIFIED', ... }
```
Retained 2 years for compliance.

---

## Phase 6: Administration & Operations Portal

### Admin Portal: `admin.travirt.com`
Separate React app (or same app with role-gated routing). IP-allowlist enforced at Cloudflare level.

#### Subscriber Management Dashboard
- Table: all users with name, email, plan, joined date, last login, trade count, P&L
- Actions: suspend account, reset password, change plan, impersonate (audit-logged)
- Filters: by plan, by signup date, by activity level

#### Revenue Dashboard
- MRR / ARR chart
- New subscribers vs churn over time
- Revenue by plan tier
- Payment failure rate
- Subscription expiry pipeline (next 30 days)

#### Support Dashboard
- Open ticket queue
- Ticket detail + reply interface
- Auto-route tickets by category (auth, billing, bug, feedback)
- Response SLA tracking

#### Platform Health Dashboard
- API response time p50/p95/p99 (Grafana or custom)
- Error rate by endpoint
- Active WebSocket connections
- Database connection pool utilization
- Redis memory utilization
- Background job queue depth (pending/active/failed)
- Market data relay status (connected/disconnected to broker)

#### AI Intelligence Dashboard
- Gemini API call count and cost per day
- News fetch success/failure rate per RSS source
- Average AI response latency
- API quota remaining

#### Risk Monitoring Dashboard
- Positions with largest unrealized loss (platform-wide)
- Most active traders today
- Unusual order patterns (unusually large order size)
- GTT/Alert trigger rate

---

## Phase 7: Folder & Service Architecture

### Backend Structure

```
/backend
│
├── /src
│   ├── server.ts                 ← Fastify app entry point
│   ├── app.ts                    ← Plugin registration, middleware
│   │
│   ├── /config
│   │   ├── env.ts                ← Zod-validated environment config
│   │   ├── database.ts           ← PostgreSQL pool setup
│   │   ├── redis.ts              ← Redis client setup
│   │   └── logger.ts             ← Pino logger setup
│   │
│   ├── /api
│   │   ├── /routes
│   │   │   ├── auth.routes.ts    ← POST /auth/register, /login, /logout, /refresh
│   │   │   ├── user.routes.ts    ← GET/PATCH /users/me, /users/me/profile
│   │   │   ├── portfolio.routes.ts ← GET /portfolio, /positions, /orders, /transactions
│   │   │   ├── trade.routes.ts   ← POST /trade/execute, /trade/bracket
│   │   │   ├── watchlist.routes.ts ← CRUD /watchlists, /watchlists/:id/groups, /symbols
│   │   │   ├── gtt.routes.ts     ← CRUD /gtt-orders
│   │   │   ├── alert.routes.ts   ← CRUD /alerts
│   │   │   ├── news.routes.ts    ← GET /news/headlines, POST /news/summarize
│   │   │   ├── funds.routes.ts   ← POST /funds/add-inr, /funds/buy-nxo, /funds/convert
│   │   │   ├── leaderboard.routes.ts ← GET /leaderboard
│   │   │   ├── subscription.routes.ts ← GET/POST /subscriptions
│   │   │   ├── support.routes.ts ← POST /support/tickets, GET /support/tickets
│   │   │   ├── settings.routes.ts ← GET/PATCH /settings
│   │   │   └── admin
│   │   │       ├── admin.users.routes.ts
│   │   │       ├── admin.analytics.routes.ts
│   │   │       ├── admin.support.routes.ts
│   │   │       └── admin.monitoring.routes.ts
│   │   │
│   │   ├── /controllers
│   │   │   ├── auth.controller.ts
│   │   │   ├── portfolio.controller.ts
│   │   │   ├── trade.controller.ts
│   │   │   ├── watchlist.controller.ts
│   │   │   ├── news.controller.ts
│   │   │   ├── leaderboard.controller.ts
│   │   │   └── admin.controller.ts
│   │   │
│   │   ├── /middleware
│   │   │   ├── authenticate.ts   ← JWT validation, req.user injection
│   │   │   ├── requireRole.ts    ← RBAC check
│   │   │   ├── rateLimiter.ts    ← Redis token bucket per user/IP
│   │   │   ├── validateBody.ts   ← Zod schema validation
│   │   │   ├── auditLog.ts       ← Automatic audit trail on writes
│   │   │   ├── requestId.ts      ← Inject X-Request-ID
│   │   │   └── errorHandler.ts   ← Centralized error formatting
│   │   │
│   │   └── /validators
│   │       ├── auth.schema.ts    ← Zod schemas for auth endpoints
│   │       ├── trade.schema.ts   ← Zod schemas for order placement
│   │       ├── watchlist.schema.ts
│   │       └── admin.schema.ts
│   │
│   ├── /auth
│   │   ├── jwt.ts                ← Sign/verify access tokens
│   │   ├── refresh.ts            ← Refresh token issue/validate/rotate
│   │   ├── password.ts           ← bcrypt hash/verify
│   │   ├── email-verification.ts ← Token generation + email send
│   │   └── session.ts            ← Redis session management
│   │
│   ├── /services
│   │   ├── trade.service.ts      ← Execution logic (ported from PortfolioContext)
│   │   ├── portfolio.service.ts  ← P&L computation, position aggregation
│   │   ├── watchlist.service.ts  ← Watchlist CRUD logic
│   │   ├── marketData.service.ts ← Broker WS connection, tick normalization
│   │   ├── gemini.service.ts     ← Server-side Gemini API calls
│   │   ├── news.service.ts       ← RSS fetch + cache (replaces browser fetch)
│   │   ├── notification.service.ts ← Email + in-app notifications
│   │   ├── subscription.service.ts ← Plan management
│   │   └── leaderboard.service.ts ← Real-time ranking computation
│   │
│   ├── /database
│   │   ├── /migrations           ← SQL migration files (numbered)
│   │   │   ├── 001_create_users.sql
│   │   │   ├── 002_create_portfolio.sql
│   │   │   ├── 003_create_watchlists.sql
│   │   │   ├── 004_create_orders.sql
│   │   │   ├── 005_create_gtt_alerts.sql
│   │   │   ├── 006_create_subscriptions.sql
│   │   │   ├── 007_create_audit_log.sql
│   │   │   └── 008_create_support.sql
│   │   ├── /models               ← TypeScript interfaces matching DB schema
│   │   │   ├── user.model.ts
│   │   │   ├── portfolio.model.ts
│   │   │   ├── order.model.ts
│   │   │   └── watchlist.model.ts
│   │   ├── /queries              ← Typed query functions per domain
│   │   │   ├── user.queries.ts
│   │   │   ├── portfolio.queries.ts
│   │   │   ├── order.queries.ts
│   │   │   └── watchlist.queries.ts
│   │   └── pool.ts               ← pg Pool singleton
│   │
│   ├── /websockets
│   │   ├── wsServer.ts           ← WebSocket server setup
│   │   ├── marketDataRelay.ts    ← Broker WS → Redis pub/sub → browser WS
│   │   ├── subscriptionManager.ts ← Track which users want which symbols
│   │   ├── portfolioUpdates.ts   ← Push P&L updates to connected clients
│   │   └── notificationPush.ts   ← Push alert triggers to browser
│   │
│   ├── /workers
│   │   ├── gttMonitor.worker.ts  ← Check GTT triggers against live prices
│   │   ├── alertMonitor.worker.ts ← Check price alerts against live prices
│   │   ├── limitOrderFill.worker.ts ← Fill pending LIMIT orders when price crosses
│   │   ├── dailyBonus.worker.ts  ← Reset daily bonus flags at midnight IST
│   │   ├── leaderboard.worker.ts ← Recompute rankings every 60s
│   │   ├── news.worker.ts        ← Scheduled RSS fetch + cache every 15min
│   │   └── subscriptionExpiry.worker.ts ← Check + notify expiring subscriptions
│   │
│   ├── /jobs
│   │   ├── queue.ts              ← BullMQ queue definitions
│   │   ├── emailJob.ts           ← Send transactional emails
│   │   ├── reportJob.ts          ← Generate daily/weekly user reports
│   │   └── cleanupJob.ts         ← Delete expired sessions, old audit logs
│   │
│   ├── /events
│   │   ├── eventBus.ts           ← In-process EventEmitter for domain events
│   │   ├── orderFilled.event.ts  ← Triggers: notification + audit log
│   │   ├── alertTriggered.event.ts
│   │   └── userRegistered.event.ts ← Triggers: welcome email + bonus NXO
│   │
│   ├── /cache
│   │   ├── newsCache.ts          ← Cache RSS results in Redis (15min TTL)
│   │   ├── leaderboardCache.ts   ← Cache rankings in Redis (60s TTL)
│   │   ├── marketSnapshotCache.ts ← Latest tick per symbol in Redis hash
│   │   └── userCache.ts          ← Cache user profile (5min TTL)
│   │
│   ├── /monitoring
│   │   ├── healthCheck.ts        ← GET /health → DB + Redis + broker status
│   │   ├── metrics.ts            ← Prometheus metrics exposition
│   │   └── alerting.ts           ← PagerDuty / Slack webhook on critical errors
│   │
│   ├── /security
│   │   ├── helmet.ts             ← Security headers
│   │   ├── cors.ts               ← CORS configuration
│   │   ├── rateLimit.ts          ← Sliding window rate limiter (Redis)
│   │   ├── csrf.ts               ← CSRF token middleware
│   │   └── ipBlock.ts            ← IP blocklist enforcement
│   │
│   ├── /compliance
│   │   ├── dataRetention.ts      ← Policy enforcement for data aging
│   │   ├── gdpr.ts               ← Right-to-erasure handler
│   │   └── disclaimer.ts         ← Ensure disclaimer accepted before trading
│   │
│   └── /integrations
│       ├── stripe.ts             ← Payment processing
│       ├── sendgrid.ts           ← Transactional email
│       ├── aliceBlue.ts          ← Broker WebSocket integration
│       └── gemini.ts             ← Google Gemini API client (server-side only)
│
├── /tests
│   ├── /unit                     ← Trade execution logic, P&L calc
│   ├── /integration              ← API endpoint tests with real DB
│   └── /e2e                      ← Playwright: login → trade → portfolio flow
│
├── /devops
│   ├── Dockerfile
│   ├── docker-compose.yml        ← Local dev: app + postgres + redis
│   ├── nginx.conf
│   └── /k8s                      ← Kubernetes manifests (if scaling to K8s)
│
└── package.json
```

### Frontend Structure (Refactored)

```
/frontend  (current travirt-9 repo, restructured)
│
├── /src
│   ├── main.tsx                  ← Entry point
│   ├── App.tsx                   ← Router + layout
│   │
│   ├── /api                      ← All backend API calls (replaces localStorage/Context)
│   │   ├── client.ts             ← Axios instance with auth interceptor + refresh logic
│   │   ├── auth.api.ts           ← login(), logout(), register(), refreshToken()
│   │   ├── portfolio.api.ts      ← getPortfolio(), getPositions(), getOrders()
│   │   ├── trade.api.ts          ← executeTrade(), executeBracket()
│   │   ├── watchlist.api.ts      ← getWatchlists(), addSymbol(), removeSymbol()
│   │   ├── news.api.ts           ← getHeadlines(), getSummary()
│   │   ├── leaderboard.api.ts    ← getLeaderboard()
│   │   ├── funds.api.ts          ← addInr(), buyNxo(), convert()
│   │   ├── gtt.api.ts
│   │   ├── alert.api.ts
│   │   ├── settings.api.ts
│   │   ├── support.api.ts
│   │   └── admin.api.ts          ← Admin-only endpoints
│   │
│   ├── /hooks
│   │   ├── useAuth.ts            ← Auth state (replaces App.tsx username state)
│   │   ├── usePortfolio.ts       ← Fetches portfolio from API (replaces Context)
│   │   ├── useWatchlist.ts       ← Fetches watchlists from API (replaces Context)
│   │   ├── useMarketData.ts      ← WebSocket subscription (backend relay)
│   │   ├── useLeaderboard.ts
│   │   ├── useSettings.ts
│   │   └── useSubscription.ts
│   │
│   ├── /stores                   ← Zustand stores (replace React Contexts for global state)
│   │   ├── authStore.ts          ← currentUser, accessToken, isAuthenticated
│   │   ├── marketDataStore.ts    ← Real-time tick data keyed by symbol
│   │   ├── uiStore.ts            ← activeScreen, modals, toast queue
│   │   └── portfolioStore.ts     ← Cached portfolio state (synced with API)
│   │
│   ├── /contexts                 ← Keep only ephemeral UI contexts
│   │   ├── ToastContext.tsx      ← Keep as-is
│   │   └── BasketContext.tsx     ← Keep as-is (basket is session-only UI state)
│   │
│   ├── /features
│   │   ├── /auth
│   │   │   ├── LoginScreen.tsx   ← Calls auth.api.ts (real)
│   │   │   ├── SignupScreen.tsx
│   │   │   ├── TfaScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   │
│   │   ├── /trading
│   │   │   ├── TradeScreen.tsx
│   │   │   ├── OrderWindow.tsx
│   │   │   ├── OptionChainPanel.tsx
│   │   │   └── ChartPanel.tsx
│   │   │
│   │   ├── /portfolio
│   │   │   ├── PortfolioScreen.tsx
│   │   │   ├── PositionsScreen.tsx
│   │   │   └── OrdersScreen.tsx
│   │   │
│   │   ├── /watchlist
│   │   │   └── WatchlistPanel.tsx
│   │   │
│   │   ├── /admin
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── SubscribersDashboard.tsx
│   │   │   ├── RevenueDashboard.tsx
│   │   │   ├── SupportDashboard.tsx
│   │   │   ├── MonitoringDashboard.tsx
│   │   │   └── UserDetailView.tsx
│   │   │
│   │   └── /subscription
│   │       ├── PricingScreen.tsx ← Connect to real plan data
│   │       ├── CheckoutScreen.tsx ← Stripe Payment Element
│   │       └── SubscriptionManageScreen.tsx
│   │
│   ├── /components
│   │   ├── /common               ← Current common components (keep)
│   │   ├── /layout               ← Header, nav (keep, wire to real auth)
│   │   ├── /trade                ← Trade components (keep, wire to API)
│   │   └── /charts               ← Chart wrappers
│   │
│   ├── /screens                  ← Keep existing screens, refactor data layer
│   │
│   ├── /services
│   │   ├── websocket.service.ts  ← Manages single WS connection, reconnect logic
│   │   └── auth.service.ts       ← Token refresh scheduling
│   │
│   ├── /utils
│   │   ├── formatters.ts         ← Keep as-is
│   │   ├── sanitize.ts           ← DOMPurify wrapper
│   │   └── errorBoundary.tsx     ← React error boundary component
│   │
│   └── /types
│       ├── api.types.ts          ← API response shapes
│       └── domain.types.ts       ← Current types.ts
│
├── /public
│   ├── favicon.svg
│   ├── robots.txt
│   └── manifest.json             ← For PWA support
│
├── vite.config.ts                ← Add manualChunks, code splitting
├── tailwind.config.js
└── package.json
```

---

## Phase 8: DevOps & Infrastructure

### CI/CD Pipeline (GitHub Actions)

```yaml
# On pull request:
- Install dependencies
- TypeScript type check (tsc --noEmit)
- Lint (ESLint)
- Unit tests (Vitest)
- Integration tests (against test database)
- Build check (vite build)

# On merge to main:
- All of the above
- Build Docker image
- Push to container registry
- Deploy to staging environment
- Run smoke tests against staging
- Await manual approval gate

# On approval:
- Deploy to production (rolling update)
- Run production smoke test
- Slack notification of deployment
- Create Git tag
```

### Environment Strategy
```
local     → docker-compose (postgres + redis + api on localhost)
staging   → Mirror of production infra, seeded with test data
production → Full infra, real secrets, monitored
```

### Container Strategy
```dockerfile
# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
USER node
CMD ["node", "dist/server.js"]
```
- Separate containers for: API server, WebSocket server, BullMQ workers
- Docker Compose for local dev
- Kubernetes (or Railway/Render) for production

### Infrastructure as Code
- Terraform for cloud resource provisioning (database, cache, DNS, CDN)
- All infra changes reviewed in PRs before apply

---

## Phase 9: Reliability & Fault Tolerance

### High Availability Architecture

| Component | HA Strategy |
|---|---|
| API servers | Multiple replicas behind load balancer |
| WebSocket server | Multiple replicas + Redis pub/sub for cross-node delivery |
| PostgreSQL | Primary + 1 read replica; automated failover |
| Redis | Redis Sentinel or Cluster mode |
| Background workers | Multiple worker processes; BullMQ handles deduplication |
| Market data relay | Single connection with automatic reconnect + fallback to mock |

### Health Checks
```
GET /health → 200 { status: 'ok', db: 'ok', redis: 'ok', broker: 'connected' }
GET /health/deep → checks all dependencies with latency
```
Load balancer health checks every 10s; unhealthy instance removed from rotation.

### Automated Backups
- PostgreSQL: daily automated snapshots to S3 (encrypted), retained 30 days
- Point-in-time recovery (PITR) enabled — restore to any second in last 7 days
- Backup restore tested monthly

### Self-Healing
- BullMQ jobs: automatic retry with exponential backoff (3 attempts)
- WebSocket broker connection: reconnect with exponential backoff on disconnect
- Failed API pod: orchestrator restarts automatically
- Database connection pool: automatic connection recycling on stale connections

### Graceful Degradation
- If broker WebSocket disconnects → switch to simulation mode automatically (existing pattern, now server-side)
- If Gemini API fails → return cached summary or "AI unavailable" message
- If RSS news fetch fails → return cached headlines (existing pattern)
- If Redis down → degrade to in-memory rate limiting, DB-backed sessions

---

## Phase 10: Future Expansion Roadmap

### Mobile Applications
- React Native app sharing component logic
- Biometric authentication (fingerprint/face ID)
- Push notifications via FCM/APNs
- Camera-based KYC document capture

### Progressive Web App (PWA)
- Add `manifest.json` + service worker
- Offline watchlist viewing
- Push notification support in browser
- "Add to Home Screen" prompt

### Real Broker Integration (Production Execution)
- Connect orders to actual broker API (Zerodha Kite, Alice Blue, Fyers)
- Paper trading mode (simulation) vs. live mode (real money)
- OAuth flow for broker account linking
- Order status webhook receiver from broker

### Advanced Analytics
- Options strategy builder (iron condor, straddle, etc.)
- Backtest engine (run strategy on historical data)
- Risk analytics (VaR, Sharpe ratio, max drawdown)
- Custom screeners (filter stocks by technical criteria)

### Community Features
- Public trade journals (opt-in)
- Strategy sharing marketplace
- Mentorship matching
- Discussion forums per sector/instrument

### Internationalization
- Multi-currency support (USD, GBP, SGD)
- Multiple markets (NYSE, LSE, SGX)
- i18n text strings for Hindi, Tamil, Telugu

### White-Label
- Tenant-level branding (logo, colors, domain)
- Custom fee structures per white-label partner
- Separate admin console per partner

---

## Bifurcated Responsibility Matrix

### Backend Jobs (Server-Side Only)

| # | Job | Service | Priority |
|---|---|---|---|
| B-01 | Real user authentication (bcrypt + JWT) | `/auth` | P0 |
| B-02 | PostgreSQL schema + migrations | `/database` | P0 |
| B-03 | Portfolio persistence (positions, orders, balances) | `/services/portfolio` | P0 |
| B-04 | Trade execution engine (server-side) | `/services/trade` | P0 |
| B-05 | Market data relay service (broker WS → Redis → browser) | `/services/marketData` | P0 |
| B-06 | Gemini API proxy (server-side, key never in browser) | `/services/gemini` | P0 |
| B-07 | Watchlist persistence in PostgreSQL | `/services/watchlist` | P0 |
| B-08 | WebSocket server for real-time delivery | `/websockets` | P0 |
| B-09 | Move secrets out of VITE env | `/config/env.ts` | P0 |
| B-10 | Session management (Redis) | `/auth/session.ts` | P0 |
| B-11 | GTT monitor background worker | `/workers/gttMonitor` | P1 |
| B-12 | Alert monitor background worker | `/workers/alertMonitor` | P1 |
| B-13 | Limit order fill worker | `/workers/limitOrderFill` | P1 |
| B-14 | Real leaderboard API (cross-user rankings) | `/services/leaderboard` | P1 |
| B-15 | RSS news fetch + Redis cache (15min) | `/workers/news` | P1 |
| B-16 | Rate limiting middleware | `/security/rateLimit` | P1 |
| B-17 | Audit logging middleware | `/api/middleware/auditLog` | P1 |
| B-18 | Input validation (Zod on all routes) | `/api/validators` | P1 |
| B-19 | Email service (verification, password reset) | `/integrations/sendgrid` | P1 |
| B-20 | Subscription management + Stripe integration | `/services/subscription` | P1 |
| B-21 | Admin API endpoints | `/api/routes/admin` | P2 |
| B-22 | Health check endpoint | `/monitoring/healthCheck` | P2 |
| B-23 | Prometheus metrics exposition | `/monitoring/metrics` | P2 |
| B-24 | Daily bonus reset cron job | `/workers/dailyBonus` | P2 |
| B-25 | Backup automation | `/devops` | P2 |
| B-26 | GDPR right-to-erasure endpoint | `/compliance/gdpr` | P3 |
| B-27 | Broker live order execution | `/integrations/aliceBlue` | P3 |
| B-28 | Partner/white-label tenant management | `/tenant-management` | P4 |

### Frontend Jobs (Browser-Side)

| # | Job | File / Area | Priority |
|---|---|---|---|
| F-01 | Replace fake login with real auth API call | `screens/auth/WebLoginScreen.tsx` | P0 |
| F-02 | Real signup with email verification flow | `screens/auth/WebSignUpScreen.tsx` | P0 |
| F-03 | JWT access token management (Axios interceptor) | `api/client.ts` | P0 |
| F-04 | Refresh token rotation (auto-refresh before expiry) | `services/auth.service.ts` | P0 |
| F-05 | Replace PortfolioContext in-memory with API calls | `hooks/usePortfolio.ts` | P0 |
| F-06 | Replace WatchlistContext localStorage with API | `hooks/useWatchlist.ts` | P0 |
| F-07 | Replace browser-direct WS with backend relay WS | `services/websocket.service.ts` | P0 |
| F-08 | Remove all VITE_ API keys from frontend env | `.env` / `constants.ts` | P0 |
| F-09 | Route AI news fetch through `/api/news` | `screens/AINewsScreen.tsx` | P0 |
| F-10 | Protect all routes — redirect to login if unauthenticated | `App.tsx` | P0 |
| F-11 | Code splitting — lazy load all screen components | `App.tsx` + `vite.config.ts` | P1 |
| F-12 | React error boundaries on all major sections | `utils/errorBoundary.tsx` | P1 |
| F-13 | Zustand store for auth state (replace React state) | `stores/authStore.ts` | P1 |
| F-14 | Real leaderboard — fetch from `/api/leaderboard` | `screens/LeaderboardScreen.tsx` | P1 |
| F-15 | Stripe Checkout integration for subscription | `features/subscription/CheckoutScreen.tsx` | P1 |
| F-16 | Forgot password + email reset flow | `screens/auth/ForgotPasswordScreen.tsx` | P1 |
| F-17 | Persist settings via `/api/settings` not localStorage | `screens/SettingsScreen.tsx` | P1 |
| F-18 | Support ticket submission to real backend | `screens/SupportScreen.tsx` | P1 |
| F-19 | Admin portal screens (subscriber, revenue, support dashboards) | `features/admin/` | P2 |
| F-20 | WebSocket reconnect logic with backoff | `services/websocket.service.ts` | P2 |
| F-21 | Virtualized list rendering for large watchlists | `components/trade/watchlist/StockRow.tsx` | P2 |
| F-22 | Add DOMPurify for user-provided content | `utils/sanitize.ts` | P2 |
| F-23 | CSP nonce on script tags | `index.html` + server | P2 |
| F-24 | Accessibility audit (ARIA labels, keyboard nav) | All interactive components | P2 |
| F-25 | PWA manifest + service worker | `/public/manifest.json` | P3 |
| F-26 | Subscription gating UI (trial banner, upgrade prompt) | `App.tsx` + layout | P3 |
| F-27 | i18n framework setup | `utils/i18n.ts` | P4 |

---

## Risk Assessment & Mitigation

| Risk | Severity | Probability | Mitigation |
|---|---|---|---|
| API keys extracted from current bundle | Critical | Certain (they're there now) | Immediately move to server-side proxy — do this before any public launch |
| Portfolio data loss (localStorage wipe) | High | Common | Backend persistence (P0 backend job) |
| Fake auth allows any login | Critical | Certain | Real auth before any user onboarding |
| Broker WebSocket CORS block (in-browser) | High | Certain | Server-side market relay (B-05) |
| Leaderboard shows fake peer data | Medium | Certain | Real cross-user rankings API (B-14) |
| Daily bonus resets on refresh | Medium | Certain | Persist claimed flag in DB |
| Gemini API cost runaway | Medium | Likely | Rate limit per user/day; server-side quota check |
| Single-region outage | High | Possible | Multi-region deploy or at minimum rapid failover |
| SQL injection | Critical | Low (if parameterized queries used) | Enforce parameterized queries; add integration tests |
| DDoS on launch | High | Possible | Cloudflare WAF + rate limiting before launch |
| Data breach (user PII) | Critical | Low (if secured) | Encryption at rest, audit logs, least-privilege DB user |
| Subscriber churn from bugs | High | Likely | Error monitoring (Sentry), fast rollback pipeline |

---

## Implementation Priority Order

### Sprint 0 — Security Triage (Before Any Public URL)
1. Move all secrets server-side (B-01, B-09)
2. Implement real authentication (B-01, F-01, F-02)
3. Implement JWT + refresh token (B-10, F-03, F-04)

### Sprint 1 — Core Data Persistence
4. PostgreSQL schema + migrations (B-02)
5. Portfolio API (B-03) + frontend wiring (F-05)
6. Watchlist API (B-07) + frontend wiring (F-06)
7. Trade execution API (B-04) + frontend wiring

### Sprint 2 — Real-Time Infrastructure
8. Market data relay service (B-05)
9. WebSocket server (B-08) + frontend client (F-07)
10. GTT/Alert monitors (B-11, B-12, B-13)

### Sprint 3 — Platform Completeness
11. News API proxy (B-15, F-09) + Gemini proxy (B-06, F-09)
12. Real leaderboard (B-14, F-14)
13. Email service (B-19)
14. Subscription + Stripe (B-20, F-15)

### Sprint 4 — Operations & Admin
15. Admin API + portal UI (B-21, F-19)
16. Monitoring + health checks (B-22, B-23)
17. Code splitting + error boundaries (F-11, F-12)
18. Audit logging (B-17)

### Sprint 5 — Quality & Hardening
19. Rate limiting + security headers (B-16, B-18)
20. Accessibility audit (F-24)
21. E2E test suite
22. Backup automation (B-25)
23. Load testing

---

*This roadmap represents the complete gap analysis between the current TraVirt v9 prototype and a production SaaS platform. Backend and frontend responsibilities are cleanly separated. Priority P0 items represent the minimum required before exposing any URL to real users.*
