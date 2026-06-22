# Open Ends — Incomplete Features Audit

Audited: 2026-06-21. All items below are confirmed stubs, placeholders, or wired to `alert()` instead of real functionality.

---

## 1. Fully Stub / Empty Screens

| # | File | Issue |
|---|------|-------|
| 1 | `screens/PositionsScreen.tsx` | **Completely empty** — just says "under construction." No position data, P&L, exit buttons, or anything functional |
| 2 | `components/trade/WatchlistPanel.tsx:198` | `SidebarOptionChainPanel` renders a `<div>` that says **"Option Chain Sidebar Placeholder"** — nothing else |

---

## 2. "Add to Basket" / ATO Basket — Dead Feature

| # | File | Issue |
|---|------|-------|
| 3 | `components/trade/MoreOptionsMenu.tsx:25` | "Add to basket" menu item fires `alert("Add to basket for SYMBOL")` — no basket exists |
| 4 | `components/trade/TradeModals.tsx:114` | `ATOBasketModal` renders: **"ATO Basket creation is coming soon!"** — entire feature absent |

---

## 3. MoreOptionsMenu — Dead Action Items

All 4 of these fire `alert(label for symbol)` and do nothing:

| # | Label | Missing functionality |
|---|-------|-----------------------|
| 5 | Chart | Should open `ChartWindow` for the stock |
| 6 | Option chain | Should open `OptionChainPanel` for the stock |
| 7 | Fundamentals | Feature not implemented anywhere |
| 8 | Technicals | Feature not implemented anywhere |

---

## 4. ChartWindow — alert() Stubs in OptionChainPanel Callbacks

| # | File:Line | Stub |
|---|-----------|------|
| 9 | `components/trade/ChartWindow.tsx:105` | `handleAddOptionToWatchlist` → `alert("Added X to Watchlist")` |
| 10 | `components/trade/ChartWindow.tsx:160-163` | `onChartSelect`, `onCreateGTT`, `onCreateAlert`, `onShowDepth` all → `alert()` |

---

## 5. FundsScreen — alert() for All Actions

| # | File:Line | Issue |
|---|-----------|-------|
| 11 | `screens/FundsScreen.tsx:15` | Add INR → `alert()` feedback |
| 12 | `screens/FundsScreen.tsx:21` | Buy NXO → `alert()` feedback |
| 13 | `screens/FundsScreen.tsx:28` | Convert NXO → `alert()` feedback |
| 14 | `screens/FundsScreen.tsx:34` | Claim bonus → `alert()` feedback |

---

## 6. BidsScreen — Task Actions are Stubs

| # | File:Line | Issue |
|---|-----------|-------|
| 15 | `screens/BidsScreen.tsx:25` | "Start" on any task (profile, tutorial, refer, social) → `alert("Starting task: X")` |
| 16 | `screens/BidsScreen.tsx` | Task completion state is hardcoded `mockTasks` array — nothing is ever actually marked completed |

---

## 7. ProfileScreen — Partially Stubbed

| # | File:Line | Issue |
|---|-----------|-------|
| 17 | `screens/ProfileScreen.tsx:216` | Phone number hardcoded to `9743732494` (disabled input) |
| 18 | `screens/ProfileScreen.tsx:166-181` | "Save profile", "Change email", "Change password" all → `alert()` |

---

## 8. PortfolioContext — alert() for Trade Errors

| # | File:Line | Issue |
|---|-----------|-------|
| 19 | `contexts/PortfolioContext.tsx:126-200` | Insufficient balance, already claimed, can't sell — all use `alert()` instead of proper UI feedback (toast/modal) |

---

## 9. LeaderboardScreen — Hardcoded Mock Data

| # | File | Issue |
|---|------|-------|
| 20 | `screens/LeaderboardScreen.tsx` | Entirely static fake data; "You" row hardcoded at rank 6 with 12.34% return — not connected to the user's actual portfolio P&L |

---

## 10. ManageWatchlistsModal — Search Not Wired

| # | File:Line | Issue |
|---|-----------|-------|
| 21 | `components/trade/ManageWatchlistsModal.tsx:115` | Search input has no `onChange` handler — typing does nothing |

---

## 11. Content Placeholders

| # | File | Issue |
|---|------|-------|
| 22 | `screens/HowItWorksScreen.tsx:100` | Video thumbnail is a `via.placeholder.com` image with no actual video embed |
| 23 | `screens/FeaturesScreen.tsx:19` | Comment says "Placeholder for feature visualization" — nothing rendered |
| 24 | `App.tsx:145` | `alert("No valid watchlist group found.")` — should be a toast notification |

---

## 12. Security (Outstanding)

| # | File | Issue |
|---|------|-------|
| 25 | `src/constants.ts` | Hardcoded plaintext Alice Blue API key — **delete this file** |
| 26 | `src/hooks/useMarketData.ts` | Dead duplicate of the active hook, depends on compromised constants — **delete this file** |

---

## Priority Ranking

**High — core broken functionality:**
- #1 PositionsScreen — completely empty
- #3/#4 Baskets — dead end in multiple places
- #5–8 MoreOptionsMenu Chart/OptionChain — primary navigation paths that dead-end

**Medium — jarring UX:**
- #11–14 FundsScreen alerts → replace with inline feedback
- #19 PortfolioContext alerts → toast or modal
- #17–18 ProfileScreen alerts + hardcoded phone

**Low — data quality / polish:**
- #20 LeaderboardScreen → connect to real portfolio P&L
- #21 ManageWatchlistsModal search → wire onChange
- #22–24 Content placeholders

**Security (do anytime):**
- #25–26 Delete legacy `src/` files
