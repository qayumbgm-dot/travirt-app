# Prop Firm Intelligence Report — TraVirt Integration Blueprint

**Source platforms studied:** instantfunding.com (marketing/product) · hub.instantfunding.com (trader dashboard SPA)  
**Audit date:** 2026-06-21  
**Constraint:** All enhancements must integrate within the existing framework. Zero changes to navigation, layout, or visual architecture.

---

## Executive Summary

InstantFunding operates a React SPA trader hub (MUI + Chart.js stack) built around four pillars: **account health monitoring**, **rule-compliance enforcement**, **performance analytics**, and **progression mechanics**. Their dashboard config exposes nine enabled sections, fourteen account-state types, twelve active risk rules, and a scaling/certification flow. Every concept below has been studied from their source and re-framed as a native capability for this platform's existing paper-trading architecture.

---

## PILLAR 1 — TRADER EXPERIENCE

---

### Feature 1.1 — Account Health Card

**Source inspiration:** InstantFunding hub `/home` dashboard — "Account Overview" panel showing balance, equity, daily summary, and a live countdown ("Your daily loss limit will refresh in…")

**Purpose:** A single at-a-glance health card that summarizes the account's current state relative to its limits, replacing the current static balance numbers with a living risk-awareness display.

**Business value:** Keeps traders aware of their standing at all times, reducing catastrophic limit breaches. On prop firms this is the single highest-impact retention feature.

**User value:** Trader knows in one glance: current equity, today's P&L, proximity to daily loss limit, and a reset countdown — without opening any sub-screen.

#### Project Relevance
The existing `DashboardScreen.tsx` and `PortfolioContext` already compute `totalPnl`, `inrBalance`, and `virtualBalance`. The Account Health Card would consume those and add computed risk metrics (daily drawdown consumed, daily loss limit remaining) on top — zero new data sources required in simulation mode.

**Expected benefits:** Dramatically raises awareness of risk state. Sets the platform apart from generic paper-trading tools.

**Implementation challenges:** Needs a new concept of "daily session" — a timestamp reset each trading day. Simulation already runs continuously so a calendar-day boundary check is needed.

#### Integration Strategy
- **Implementation approach:** Add a `DailySession` concept to `PortfolioContext`: store `sessionStartTime` and `sessionStartVirtualBalance` in state. Derive `dailyPnl = currentVirtualBalance - sessionStartVirtualBalance`. Auto-reset at midnight.
- **Required changes to existing files:**
  - `contexts/PortfolioContext.tsx` — add `dailyPnl`, `sessionStartBalance`, `sessionDate` to portfolio state
  - `screens/DashboardScreen.tsx` — add the Account Health Card component as the first card in the existing grid layout (no layout change — replaces or extends the current balance card)
- **No backend needed** — all computed from in-memory state
- **No new dependencies**

#### Architecture Impact
- Touches only `PortfolioContext` and `DashboardScreen`
- Zero impact on charting, watchlist, or order systems
- The `sessionDate` persists in the same ephemeral state as the rest — resets on page refresh (appropriate for a simulation)
- Scalable: when Alice Blue credentials are added, the same daily P&L computation applies to real-feed data

#### UI/UX Compliance
- Fits inside existing `DashboardScreen` card grid using existing Tailwind classes (`bg-surface`, `rounded-lg`, `text-success/text-danger`)
- No new navigation items
- No layout change — it is a card replacement, not a new screen

---

### Feature 1.2 — Performing Instruments Panel

**Source inspiration:** InstantFunding hub — "Performing Instruments" and "Overall Account Statistics" sections with Longs Won / Shorts Won breakdown

**Purpose:** Tracks which instruments the trader performs best and worst on, and whether their edge comes from long or short positions.

**Business value:** Surfaces behavioral patterns that help the platform retain engaged traders ("You have a 68% win rate on NIFTY longs").

**User value:** Trader discovers their actual statistical edge (or lack thereof) by instrument, rather than relying on gut feeling.

#### Project Relevance
`PortfolioContext` already stores `orderHistory` with `symbol`, `transactionType` (BUY/SELL), `price`, and `status`. Win/loss can be computed by matching paired BUY+SELL orders.

**Expected benefits:** Elevates the platform from a basic paper-trading log to a genuine performance lab.

**Implementation challenges:** Pairing BUY and SELL orders correctly (FIFO matching). Options and futures have different P&L semantics than equity.

#### Integration Strategy
- **Implementation approach:** A pure computation over `portfolio.orderHistory` — group by symbol, compute realized P&L per round-trip (FIFO), bucket by long/short.
- **Recommended location:** New tab inside `PortfolioScreen.tsx` — a "Performance" tab alongside the existing "Holdings" table. No new screen needed.
- **Required changes:**
  - `contexts/PortfolioContext.tsx` — expose `computeInstrumentStats()` selector (pure function, no new state)
  - `screens/PortfolioScreen.tsx` — add a "Stats" tab next to current table

#### UI/UX Compliance
- Tab pattern already exists in `OrdersScreen.tsx` — identical pattern can be applied to PortfolioScreen
- No visual architecture change

---

### Feature 1.3 — Economic Calendar Integration

**Source inspiration:** InstantFunding hub navigation — "Economic Calendar" as a first-class dashboard section

**Purpose:** Embed a macro event calendar so traders understand what scheduled events (RBI policy, earnings, index rebalancing) may impact their positions.

**Business value:** Positions the platform as a professional-grade tool rather than a gamified simulator.

**User value:** Trader avoids holding positions through high-impact events — mirrors real prop firm "news trading" discipline.

#### Project Relevance
The existing `screens/` already has a pattern for full-page content screens. The `AINewsScreen.tsx` is the nearest analogue.

**Implementation approach:** Replace the placeholder "HowItWorksScreen" video section with an embedded economic calendar, or — better — add it as a new tab in `DashboardScreen`. Use the free Investing.com calendar widget (iframe embed) or Tradays API. No backend required.

#### UI/UX Compliance
- Calendar iframe fits in the existing `bg-surface rounded-lg` card pattern
- No layout change

---

## PILLAR 2 — RISK MANAGEMENT

---

### Feature 2.1 — Daily Loss Limit Engine

**Source inspiration:** InstantFunding hub — "Max Permitted Loss", "Daily Loss Limit Reset Time", "Your daily loss limit will refresh in…" countdown, and "Breach" detection when the limit is violated

**Purpose:** A hard rule that tracks today's net P&L and fires a visual warning when the trader approaches, and a hard block when they hit, the daily loss limit.

**Business value:** The single most important risk discipline in prop trading. Teaching this pattern is the core value proposition of a paper-trading simulation.

**User value:** Trader learns to respect daily drawdown limits before it costs them in a real funded account.

#### Project Relevance
This fits directly into the paper-trading model. No real money is at risk — the "block" is educational, not financial.

**Implementation approach:**

1. Define `DAILY_LOSS_LIMIT_PERCENT = 0.05` (5% of starting balance) in `constants.ts`
2. In `PortfolioContext`: compute `dailyLossConsumed = (sessionStartBalance - currentVirtualBalance) / sessionStartBalance`
3. States: `safe` (0–80%), `warning` (80–99%), `breached` (≥100%)
4. In `OrderWindow.tsx`: block new orders when state is `breached`, showing an inline banner instead of `alert()`
5. In `DashboardScreen.tsx`: show a progress bar in the Account Health Card (Feature 1.1)

**Risk limit config object (add to `constants.ts`):**
```typescript
export const RISK_CONFIG = {
  dailyLossLimitPct: 0.05,       // 5% of balance
  maxDrawdownPct: 0.10,          // 10% all-time drawdown
  warningThresholdPct: 0.80,     // show warning at 80% consumed
};
```

#### Architecture Impact
- Centralised in `PortfolioContext` — `executeTrade()` checks the limit before proceeding
- `OrderWindow.tsx` receives the state via context and conditionally renders the block banner
- No new screen, no layout change, no new navigation

#### UI/UX Compliance
- Warning banner uses existing `bg-yellow-500/10 text-yellow-400` pattern (same as ChartPanel's option-chain notice)
- Breach banner uses `bg-danger/10 text-danger`
- Progress bar fits inside existing card grid

---

### Feature 2.2 — Maximum Drawdown Monitor

**Source inspiration:** InstantFunding hub — "Max Permitted Loss" (absolute drawdown from peak equity), "Smart Drawdown" (trailing drawdown from account high-water mark), "Breaches" list

**Purpose:** Track the all-time drawdown from the account's peak equity (high-water mark), not just the current day — the stricter risk metric.

**Business value:** Teaches the most important risk concept in professional trading: preserving capital from the peak, not just the starting point.

**User value:** Trader sees their worst-case drawdown at a glance and understands the difference between daily and absolute drawdown.

#### Integration Strategy
- Add `peakVirtualBalance` to `PortfolioContext` state — updated any time `virtualBalance` reaches a new high
- `maxDrawdown = (peakVirtualBalance - currentVirtualBalance) / peakVirtualBalance`
- Show in Account Health Card as a second progress bar alongside daily loss limit
- `peakVirtualBalance` persists in `localStorage` so it survives page refreshes (unlike ephemeral simulation state)

#### UI/UX Compliance
- Single new field in context state
- Display inside existing dashboard card — no structural change

---

### Feature 2.3 — Rule Violation (Breach) System

**Source inspiration:** InstantFunding hub — "Breaches" section listing specific rule violations: Stop Loss Time, Tick Scalping Limit, Martingale Positions Limit, Stacking Positions Limit, Profit Consistency, News Trading, Weekend Holding

**Purpose:** A rule engine that detects when a trader violates a defined trading discipline and records the breach with a timestamp and description.

**Business value:** Creates a learning loop — the trader sees their own violation history and can change behaviour.

**User value:** "You entered 3 trades in the same direction within 60 seconds (stacking violation)" is infinitely more educational than a blocked order.

#### Adapted Rules for Paper Trading Context

| Rule | Detection Logic | Severity |
|------|----------------|----------|
| Position Stacking | >2 open positions in the same instrument | Warning |
| Martingale Pattern | Each new order in losing symbol is larger than previous | Warning |
| Stop Loss Required | Market order placed without a GTT stop loss set | Info |
| Overtrading | >20 orders in a single trading day | Warning |
| Consistency Score | Winning day profit > 3× average daily profit | Info |
| Daily Loss Breach | Daily drawdown ≥ 5% | Hard Block |
| Max Drawdown Breach | Absolute drawdown ≥ 10% | Hard Block |

#### Integration Strategy
- Add `breaches: Breach[]` to `PortfolioContext` state
- `Breach` type: `{ id, rule, description, timestamp, severity }`
- Detection fires inside `executeTrade()` in `PortfolioContext.tsx`
- New "Breaches" tab inside `OrdersScreen.tsx` (existing tab pattern, just add a 4th tab: `orders | gtt | alerts | breaches`)

#### UI/UX Compliance
- 4th tab in `OrdersScreen` — exact same `TabButton` pattern already exists
- No new navigation, no screen addition

---

### Feature 2.4 — Position Sizing Calculator

**Source inspiration:** InstantFunding hub — leverage display, account balance display, and risk-per-trade awareness shown in account overview

**Purpose:** A quick calculator inside the order window that shows the trader the % of their account they are risking on the current order.

**User value:** "You are risking 8.3% of your account on this trade" — displayed live as the trader adjusts quantity.

#### Integration Strategy
- Add to `OrderWindow.tsx` as an inline computed display below the quantity input
- Formula: `riskPercent = (quantity × ltp) / virtualBalance × 100`
- Color-coded: green (<2%), yellow (2–5%), red (>5%)
- Zero new state, zero new context — purely derived from existing props

#### UI/UX Compliance
- Inline text display inside the existing `OrderWindow` — no structural change

---

## PILLAR 3 — PERFORMANCE ANALYTICS

---

### Feature 3.1 — Equity Curve

**Source inspiration:** InstantFunding hub — "Current Results" section with equity display, and the "Analytics" section visible in the main JS bundle

**Purpose:** A line chart of the account's equity over time, plotted trade-by-trade.

**Business value:** The equity curve is the single most powerful performance visualisation in trading. It shows consistency, drawdown periods, and recovery patterns.

**User value:** Trader can see their full account history as a chart — not just a list of trades.

#### Integration Strategy
- `PortfolioContext`: add `equityHistory: { timestamp: number; equity: number }[]` to state
- Push a new snapshot on every `executeTrade()` call
- Add an "Equity" tab to `PortfolioScreen.tsx` using lightweight-charts (already installed) — `addLineSeries()` with `autoSize: true`
- The y-axis is virtual balance; the x-axis is time

**Why lightweight-charts:** Already in the project, already working. Consistent visual style with `ChartPanel.tsx`.

#### UI/UX Compliance
- New tab inside `PortfolioScreen` — identical to `OrdersScreen` tab pattern
- Uses existing lightweight-charts infrastructure — zero new dependencies

---

### Feature 3.2 — Win Rate & Trade Statistics Dashboard

**Source inspiration:** InstantFunding hub — "Longs Won", "Shorts Won", "Overall Account Statistics", "Performing Instruments"

**Purpose:** A statistics panel showing: win rate, average win, average loss, profit factor, best trade, worst trade, average holding time, total trades.

**Metrics to compute (all from `portfolio.orderHistory`):**

| Metric | Formula |
|--------|---------|
| Win Rate | Winning trades ÷ Total closed trades |
| Profit Factor | Gross profit ÷ Gross loss |
| Average Win | Mean P&L of winning trades |
| Average Loss | Mean P&L of losing trades |
| Expectancy | (WinRate × AvgWin) − (LossRate × AvgLoss) |
| Max Consecutive Wins | Longest winning streak in order history |
| Max Consecutive Losses | Longest losing streak |
| Best Trade | Single highest P&L |
| Worst Trade | Single lowest P&L |

#### Integration Strategy
- Pure computation over `orderHistory` — no new state
- Display as a stats grid inside the "Stats" tab of `PortfolioScreen.tsx` (from Feature 1.2)
- Use the existing `PortfolioHeader` component pattern (already a reusable card in `PortfolioScreen`)

#### UI/UX Compliance
- Same card grid pattern already in `PortfolioScreen` — `grid grid-cols-2 md:grid-cols-4 gap-4`
- No structural change

---

### Feature 3.3 — Trade Journal

**Source inspiration:** InstantFunding hub — "Order History" with account, instrument, status, credentials columns; and the "Analytics" feature visible in the dashboard nav

**Purpose:** Elevate `OrdersScreen`'s existing order list into a proper trade journal with per-trade P&L, holding duration, entry/exit prices, and an optional note field.

**Current state:** `OrdersScreen` shows orders but has no P&L column, no holding duration, no notes.

**Enhancement:**
- Match BUY/SELL pairs (FIFO) to compute realized P&L per round-trip
- Add columns: Realized P&L, % Return, Holding Time, Notes
- The notes field uses the existing `NotesEditor.tsx` component (already in the codebase)
- Export as CSV: a simple `Blob` download

#### Integration Strategy
- `contexts/PortfolioContext.tsx` — add a `pairOrders()` utility that FIFO-matches orders into closed trades
- `screens/OrdersScreen.tsx` — extend the existing order table with the new columns
- The CSV export button: `window.URL.createObjectURL(new Blob([csvString]))` — no library needed

#### UI/UX Compliance
- Extra columns in existing table — no new screen, no nav change
- Notes column uses existing `NotesEditor` pattern

---

### Feature 3.4 — Consistency Score

**Source inspiration:** InstantFunding hub — "Profit Consistency" rule, and the consistency-rule logic visible in the breach system

**Purpose:** A numeric score (0–100) that measures how evenly distributed a trader's profits are across trading days — penalising traders who earn all their P&L in one or two lucky trades.

**Why it matters:** Prop firms use consistency to detect gamblers vs. disciplined traders. A single 10× winning day that rescues a losing streak scores 20/100; even daily gains score 90/100.

**Formula:**
```
Consistency Score = 100 × (1 − (MaxSingleDayPnl / TotalPnl))
where MaxSingleDayPnl is the highest single-day P&L as a fraction of total P&L
Clamped to 0–100.
```

#### Integration Strategy
- Pure computation from `equityHistory` (Feature 3.1) grouped by calendar day
- Display as a score gauge in the Stats tab of `PortfolioScreen`
- Color: green (>70), yellow (40–70), red (<40)

---

## PILLAR 4 — EVALUATION FRAMEWORKS

---

### Feature 4.1 — Challenge / Objective System

**Source inspiration:** InstantFunding hub — "Objectives" section with tracked targets: Profit Target, Minimum Trading Days, Account Status (Not Passed / Passed / Failed). Account types: Challenge, Trial Challenge, Funded, Trial Funded.

**Purpose:** A structured paper-trading evaluation that mirrors the prop firm challenge model. The trader sets a target (e.g., "Grow account 10% in 30 days without breaching 5% daily drawdown") and the platform tracks their progress.

**Business value:** Transforms the platform from an open sandbox into a goal-driven experience. Creates natural engagement cycles (challenge attempt → pass → next level).

**User value:** "Day 12/30 · Profit: +₹4,200 (+4.2%) · Target: +10% · Daily Limit Used: 2.1% of 5%" — enormously motivating.

#### Challenge Structure (adapted for paper trading)

```typescript
interface Challenge {
  id: string;
  name: string;                    // e.g., "30-Day Consistency Challenge"
  startDate: number;               // Unix timestamp
  endDate: number;
  startingBalance: number;
  profitTargetPct: number;         // e.g., 0.10 (10%)
  maxDailyLossPct: number;         // e.g., 0.05 (5%)
  maxDrawdownPct: number;          // e.g., 0.10 (10%)
  minTradingDays: number;          // e.g., 10
  status: 'active' | 'passed' | 'failed';
  breaches: string[];
}
```

#### Integration Strategy
- New `challenges: Challenge[]` array in `PortfolioContext` state
- New screen: `screens/ChallengeScreen.tsx` — but this is optional. The objectives can be displayed as a card on `DashboardScreen` without a new screen.
- `PortfolioContext.executeTrade()` checks challenge constraints and updates status
- Passed challenges generate a certificate (see Feature 6.2)

#### UI/UX Compliance
- Challenge status card fits in the existing `DashboardScreen` grid
- If a full screen is added, it uses existing `<main className="animate-fade-in p-6">` wrapper pattern

---

### Feature 4.2 — Objective Progress Tracker

**Source inspiration:** InstantFunding hub — "Objectives" panel showing Profit Target, Minimum Trading Days, with pass/fail indicators per objective

**Purpose:** Visual progress bars for each objective within a challenge — so the trader knows exactly where they stand on each condition.

**Objectives to track:**

| Objective | Display |
|-----------|---------|
| Profit Target | ₹X of ₹Y target · progress bar |
| Trading Days | N of M days with at least 1 trade |
| Daily Loss Compliance | Days where limit was respected |
| No Max Drawdown Breach | Green checkmark or red X |
| Consistency Score | ≥70 required to pass |

#### Integration Strategy
- Derived from `PortfolioContext` state — no new data
- Render as a card with progress bars using existing Tailwind pattern
- Location: `DashboardScreen.tsx` if challenge is active

---

## PILLAR 5 — INTELLIGENCE & MONITORING

---

### Feature 5.1 — Toast Notification System (replaces all alert() calls)

**Source inspiration:** InstantFunding hub — the platform uses proper in-app toast notifications for all state transitions, never `window.alert()`.

**Purpose:** Replace all 26 `alert()` calls in the codebase with a non-blocking toast notification system.

**Business value:** Professional UX — alerts block the UI thread and look unprofessional.

**This directly resolves open ends #11–14, #17–18, #19 from `10_open_ends.md`.**

#### Implementation Strategy
A lightweight custom toast system requires zero new dependencies:

```typescript
// contexts/ToastContext.tsx
interface Toast { id: string; message: string; type: 'success' | 'error' | 'warning' | 'info'; }
```

- `ToastContext` wraps the app in `App.tsx` — single provider
- `useToast()` hook: `const { showToast } = useToast();`
- Toast container: fixed position `bottom-right`, stacks, auto-dismisses after 3s
- All `alert()` calls replaced with `showToast(message, type)`

#### Files to update (replacing alert calls):
- `contexts/PortfolioContext.tsx` — 6 alerts
- `screens/FundsScreen.tsx` — 4 alerts
- `screens/BidsScreen.tsx` — 2 alerts
- `screens/ProfileScreen.tsx` — 4 alerts
- `components/trade/ChartWindow.tsx` — 5 alerts
- `components/trade/MoreOptionsMenu.tsx` — 1 alert
- `components/trade/TradeModals.tsx` — 1 alert
- `App.tsx` — 1 alert

#### UI/UX Compliance
- Toast container is `position: fixed bottom-4 right-4 z-[200]` — overlays content, never shifts layout
- Uses existing colour tokens: `bg-success`, `bg-danger`, `bg-yellow-500`, `bg-primary`

---

### Feature 5.2 — Real-Time Alert Engine

**Source inspiration:** InstantFunding hub — "Create alert / ATO" feature, and the existing `AlertCreateModal` in this codebase which already creates alerts but never fires them

**Purpose:** The existing `Alert` system in `PortfolioContext` stores alerts but never evaluates them against live market data. This feature activates the alert engine.

**Current state:** `portfolio.alerts` array exists and stores created alerts. `deleteAlert()` exists. But nothing ever fires an alert when the price condition is met.

**Enhancement:**
- Add an `evaluateAlerts()` function called on every market data tick (inside `useMarketData`'s simulation interval, or a `useEffect` watching `marketData` in `App.tsx`)
- When `alert.property === 'ltp' && alert.operator === 'GTE' && currentLtp >= alert.value`, fire the alert
- Fired alert: update status to `'TRIGGERED'` in context, push a toast, optionally change browser tab title ("ALERT: TATASTEEL crossed ₹1,250")

#### Integration Strategy
- `App.tsx` or `PortfolioContext.tsx` — add `useEffect` watching `marketData` that calls `evaluateAlerts()`
- Fired alerts auto-update status via existing `portfolio.alerts` mutation pattern
- Toast notification via Feature 5.1

---

### Feature 5.3 — Account Status Indicators

**Source inspiration:** InstantFunding hub — account status badges: Active, Suspended, Cancelled, In Progress, Passed, Failed — shown in Trading Accounts section

**Purpose:** A prominent status indicator on the dashboard that reflects the trader's current challenge/evaluation state.

**Adapted states for paper trading:**

| State | Condition | Color |
|-------|-----------|-------|
| On Track | Daily loss <80% used, P&L positive | Green |
| At Risk | Daily loss 80–99% used, or P&L negative | Yellow |
| Breached | Daily loss ≥100% or max drawdown hit | Red |
| Challenge Passed | All objectives met | Blue / Gold |
| Simulation | No challenge active | Grey |

#### UI/UX Compliance
- Status badge appears in the Account Health Card (Feature 1.1) — no new layout component needed

---

## PILLAR 6 — GAMIFICATION & ENGAGEMENT

---

### Feature 6.1 — Achievement System (extends BidsScreen)

**Source inspiration:** InstantFunding hub — "Competitions", the task-completion system, "Certificates" section, and the Leaderboard

**Purpose:** A structured achievement system that replaces the current `BidsScreen` stub tasks (which fire `alert("Starting task: X")`) with real verifiable achievements.

**This directly resolves open ends #15–16 from `10_open_ends.md`.**

#### Achievement Definitions

| Achievement | Trigger | NXO Reward |
|-------------|---------|------------|
| First Trade | Execute first ever trade | 10 |
| 10 Trades Executed | `orderHistory.length >= 10` | 20 |
| First Profitable Day | `dailyPnl > 0` at session end | 15 |
| 5 Consecutive Winning Trades | Detect streak in `orderHistory` | 25 |
| First GTT Created | `gttOrders.length >= 1` | 10 |
| First Alert Created | `alerts.length >= 1` | 10 |
| Consistency Badge | Consistency score ≥ 70 for 7 days | 50 |
| Challenge Passed | First challenge status = 'passed' | 100 |
| Profile Completed | All profile fields filled | 5 |
| Watchlist Organiser | 3+ watchlists created | 10 |

#### Integration Strategy
- Add `achievements: Achievement[]` and `unlockedAchievements: string[]` to `PortfolioContext`
- `Achievement` type: `{ id, name, description, nxoReward, condition: (portfolio) => boolean }`
- Evaluate after every `executeTrade()`, `createGTT()`, `createAlert()` call — unlock if condition newly met
- `BidsScreen.tsx` — replace hardcoded `mockTasks` with `achievements` from context; "Start" button shows progress, "Claim" appears when condition is met

#### UI/UX Compliance
- `BidsScreen.tsx` already renders a task list — the data source changes but the layout remains identical

---

### Feature 6.2 — Performance Certificate

**Source inspiration:** InstantFunding hub — "Certificates" section in the dashboard sidebar

**Purpose:** When a trader passes a challenge (Feature 4.1), generate a printable/downloadable performance certificate.

**User value:** Shareable proof of trading discipline — a strong retention and referral mechanic.

#### Implementation Strategy
- A React component that renders a styled certificate using existing Tailwind classes
- Data: trader name (from `ProfileScreen` state), challenge name, dates, final P&L %, consistency score, pass date
- Print via `window.print()` with a print-only CSS class — no PDF library needed
- Location: downloadable from the Challenge card on `DashboardScreen` when status = 'passed'

#### UI/UX Compliance
- Certificate is a modal overlay using existing `ReactDOM.createPortal` pattern
- No new navigation or screen

---

### Feature 6.3 — Live Leaderboard (connected to portfolio)

**Source inspiration:** InstantFunding hub — "Leaderboard" section with monthly returns ranking; "Competitions" feature

**Purpose:** Replace the entirely hardcoded `LeaderboardScreen.tsx` with a leaderboard that at minimum shows the current user's actual portfolio performance in the correct rank row.

**This directly resolves open end #20 from `10_open_ends.md`.**

**Current state:** Rank 6 "You" is hardcoded to 12.34% return.

**Enhancement:**
- Compute actual `userReturnPercent = (portfolio.totalPnl / portfolio.totalInvested) * 100` from `PortfolioContext`
- Replace the hardcoded "You" row's `returns` value with the live computed value
- Re-sort the list after substituting the real value
- Future: if multiple browser sessions/localStorage profiles exist, ranks can be real

#### Integration Strategy
- `screens/LeaderboardScreen.tsx` — import `usePortfolio()`, compute `userReturnPercent`, replace the `returns: 12.34` constant with the live value
- 3-line change to an existing screen

---

### Feature 6.4 — Trading Streak & Daily Login System

**Source inspiration:** InstantFunding hub — "Trial ends in" and "Account Ends In" countdown timers; the daily bonus system already partially built in `BidsScreen` and `FundsScreen`

**Purpose:** A trading streak counter that counts consecutive days the user placed at least one trade.

**User value:** "Current Streak: 7 days" — encourages daily engagement.

#### Integration Strategy
- Add `tradingStreak: number` and `lastTradingDate: string` to `PortfolioContext`
- On `executeTrade()`: if today's date !== `lastTradingDate`, increment streak and update date
- If a day is missed, streak resets to 1
- Display in Account Health Card (Feature 1.1) as a flame icon with streak count

---

## PILLAR 7 — REPORTING & VISUALIZATION

---

### Feature 7.1 — Daily P&L Summary

**Source inspiration:** InstantFunding hub — "Daily Summary" panel with equity, daily P&L, and account metrics

**Purpose:** A concise daily summary card showing today's performance: trades taken, net P&L, largest win, largest loss, instruments traded.

#### Integration Strategy
- Derived entirely from `portfolio.orderHistory` filtered to today's date
- Display as a collapsible card on `DashboardScreen.tsx`
- Date filter: `order.timestamp >= sessionStartTime`

---

### Feature 7.2 — P&L Calendar (Monthly View)

**Source inspiration:** InstantFunding hub — "Monthly" / "Weekly" / "Yearly" period selectors in the analytics section

**Purpose:** A calendar heatmap showing daily P&L — green for positive days, red for negative days, with the magnitude shown by colour intensity.

**Business value:** Instantly reveals trading patterns — "I lose money on Mondays" or "I am consistently profitable mid-week".

**User value:** Same as institutional trader tools (Tradervue, Edgewonk, TradeZella).

#### Implementation Strategy
- Build a pure CSS/React calendar grid — 7 columns (Mon–Sun), rows for each week of the month
- Colour intensity: `opacity = Math.min(1, Math.abs(dayPnl) / maxAbsDayPnl)`
- Data: `equityHistory` (Feature 3.1) grouped by calendar day
- Add a "Calendar" tab to `PortfolioScreen` alongside Equity and Stats tabs

#### UI/UX Compliance
- CSS grid calendar uses Tailwind grid utilities — no new charting library
- Consistent colour semantics: green for profit (`text-success`), red for loss (`text-danger`)

---

### Feature 7.3 — Risk Report Card

**Source inspiration:** InstantFunding hub — Breach list, Max Permitted Loss display, Stop Loss Time rule, Smart Drawdown, and the full risk metrics visible in the account statistics section

**Purpose:** A single downloadable/printable report that summarises the account's risk metrics for a given period.

**Report sections:**
1. Account Summary (balance, P&L, equity)
2. Risk Metrics (daily drawdown consumed, max drawdown, days near breach)
3. Rule Compliance (table of all rules and pass/fail)
4. Performing Instruments (top 5 best, top 5 worst)
5. Consistency Score trend
6. Equity curve (screenshot of lightweight-charts chart)

#### Implementation Strategy
- Rendered as a React component that is print-ready
- `window.print()` with `@media print` CSS
- No PDF library — browser print dialog handles layout

---

### Feature 7.4 — AI Insights (extends AINewsScreen)

**Source inspiration:** InstantFunding hub — "Analytics" feature visible in nav; the existing `geminiService.ts` in this codebase

**Purpose:** Use the existing Gemini AI service (already wired in `geminiService.ts`) to generate personalised trading insights based on the trader's actual performance data.

**Current state:** `AINewsScreen.tsx` uses Gemini to summarise news. The same service can be called with portfolio data.

**Prompt template:**
```
Given this trader's statistics:
- Win Rate: {winRate}%
- Profit Factor: {profitFactor}
- Consistency Score: {consistencyScore}
- Worst performing instrument: {worstInstrument}
- Trading streak: {streak} days
- Current drawdown: {drawdown}%

Provide 3 specific, actionable recommendations for improving their trading discipline.
Keep each recommendation under 50 words.
```

#### Integration Strategy
- Add an "Insights" tab to `PortfolioScreen` or `DashboardScreen`
- Call `geminiService.getInsights(portfolioStats)` — new function in existing service file
- Display as 3 insight cards with icons

---

## PILLAR 8 — STRUCTURAL INTEGRITY (Cross-cutting)

---

### Feature 8.1 — Toast/Notification Infrastructure

**Priority: CRITICAL — blocks all other features**

All features above that surface information to the user depend on a non-blocking notification system. Feature 5.1 (Toast System) must be implemented first before any other feature above replaces `alert()` calls.

**Implementation order:**
1. `contexts/ToastContext.tsx` — create context + hook
2. `components/common/ToastContainer.tsx` — render fixed overlay
3. `App.tsx` — wrap with `<ToastProvider>`
4. Replace all 26 `alert()` calls throughout the codebase

---

### Feature 8.2 — Security Cleanup

**Priority: HIGH — outstanding from prior audit**

| Action | File | Method |
|--------|------|--------|
| Delete legacy constants | `src/constants.ts` | `rm src/constants.ts` |
| Delete legacy hook | `src/hooks/useMarketData.ts` | `rm src/hooks/useMarketData.ts` |

These files are not compiled but expose a hardcoded API key to anyone who accesses the source directory or git history.

---

## Implementation Roadmap

### Phase 1 — Foundation (enables everything else)
| Feature | Files Changed | Effort |
|---------|--------------|--------|
| 5.1 Toast System | New `ToastContext.tsx`, `ToastContainer.tsx`, 8 existing files | Small |
| 2.1 Daily Loss Limit Engine | `PortfolioContext.tsx`, `constants.ts`, `OrderWindow.tsx` | Small |
| 2.2 Max Drawdown Monitor | `PortfolioContext.tsx` (1 new state field) | Tiny |
| 8.2 Security Cleanup | Delete 2 files | Tiny |

### Phase 2 — Dashboard Intelligence
| Feature | Files Changed | Effort |
|---------|--------------|--------|
| 1.1 Account Health Card | `PortfolioContext.tsx`, `DashboardScreen.tsx` | Medium |
| 2.4 Position Sizing Calculator | `OrderWindow.tsx` (inline, no new component) | Tiny |
| 5.2 Alert Engine Activation | `App.tsx` (1 useEffect) | Small |
| 6.3 Live Leaderboard | `LeaderboardScreen.tsx` (3 lines) | Tiny |

### Phase 3 — Performance Analytics
| Feature | Files Changed | Effort |
|---------|--------------|--------|
| 3.1 Equity Curve | `PortfolioContext.tsx`, `PortfolioScreen.tsx` | Medium |
| 3.2 Win Rate Stats | `PortfolioScreen.tsx` (new tab) | Small |
| 7.2 P&L Calendar | `PortfolioScreen.tsx` (new tab, CSS grid) | Medium |
| 1.2 Performing Instruments | `PortfolioScreen.tsx` (new tab) | Small |

### Phase 4 — Gamification & Evaluation
| Feature | Files Changed | Effort |
|---------|--------------|--------|
| 6.1 Achievement System | `PortfolioContext.tsx`, `BidsScreen.tsx` | Medium |
| 4.1 Challenge System | `PortfolioContext.tsx`, `DashboardScreen.tsx` | Large |
| 2.3 Breach System | `PortfolioContext.tsx`, `OrdersScreen.tsx` | Medium |
| 3.4 Consistency Score | `PortfolioContext.tsx` (pure function) | Small |

### Phase 5 — AI & Reporting
| Feature | Files Changed | Effort |
|---------|--------------|--------|
| 7.4 AI Insights | `geminiService.ts`, `PortfolioScreen.tsx` | Small |
| 6.2 Performance Certificate | New `CertificateModal.tsx` | Medium |
| 7.3 Risk Report Card | New `RiskReport.tsx` (print-ready) | Medium |
| 1.3 Economic Calendar | `DashboardScreen.tsx` (iframe embed) | Small |

---

## Architecture Impact Summary

| Existing Module | Impact |
|----------------|--------|
| `PortfolioContext.tsx` | Extended with new state fields and selectors — no breaking changes |
| `DashboardScreen.tsx` | New cards added to existing grid — no layout change |
| `OrdersScreen.tsx` | 4th tab (Breaches) added — existing tab pattern |
| `PortfolioScreen.tsx` | 3 new tabs (Equity, Stats, Calendar) — existing tab pattern |
| `BidsScreen.tsx` | Data source changes from hardcoded mock to context achievements |
| `LeaderboardScreen.tsx` | One computed value replaces a hardcoded constant |
| `OrderWindow.tsx` | Inline risk display + daily loss block banner added |
| `App.tsx` | Toast provider wrapper + alert evaluator useEffect |
| `ChartPanel.tsx` | No change |
| `TradeScreen.tsx` | No change |
| `ChartWindow.tsx` | Alert stubs replaced with toast calls |

**Zero new screens required for Phases 1–3.**  
**Zero navigation changes required for any phase.**  
**Zero layout or visual architecture changes required.**

---

## Confirmation of UI/UX Compliance

All features in this report have been designed with the following constraints verified:

1. **Existing display design unchanged** — no Tailwind class replacements, no layout restructuring
2. **Framework structure preserved** — all additions use existing component patterns (`bg-surface`, `rounded-lg`, `animate-fade-in p-6`, `TabButton`)
3. **Navigation unchanged** — no new top-level nav items; all new content lives as tabs within existing screens or as cards within existing screen grids
4. **Visual consistency** — all new UI elements use existing colour tokens: `text-success`, `text-danger`, `text-primary`, `text-muted`, `bg-overlay`, `bg-surface`, `bg-base`
5. **Dependency-free where possible** — lightweight-charts (already installed), Gemini (already installed), no new npm packages required for Phases 1–4

---

*This document is the master reference for all prop-firm-inspired feature additions. Cross-reference with `10_open_ends.md` for open-end resolution mapping and `ARCHITECTURE.md` for module dependency context.*
