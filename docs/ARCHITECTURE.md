# TraVirt Platform — Architecture Overview & Traceability Map

---

## Platform Summary

**TraVirt** (Virtual Trading Platform) is a browser-based paper-trading simulation application built on React 18 + TypeScript, bundled with Vite 5, and styled with Tailwind CSS v3. It provides Indian retail traders with a zero-risk environment to practice equity, F&O, and index trading against simulated live market data, with an optional real-time feed via the Alice Blue Noren WebSocket API.

The platform is a pure single-page application (SPA). All state is in-memory (React Context + `useState`). There is no backend server, no database, and no authentication backend — all credentials, portfolio data, and watchlist configurations are ephemeral (reset on page reload), with the sole exception of the `OrderWindow` tab preference which is persisted to `localStorage`.

---

## Architecture Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (SPA)                              │
│                                                                    │
│  ┌─────────────┐  ┌──────────────────────────────────────────┐   │
│  │  Entry Point│  │             React App Tree                │   │
│  │  index.html │  │                                           │   │
│  │  index.tsx  │  │  <StrictMode>                             │   │
│  └─────────────┘  │    <PortfolioProvider>  ← useMarketData   │   │
│                   │      <WatchlistProvider>                   │   │
│                   │        <App>                               │   │
│                   │          <WebHeader>                       │   │
│                   │          <WatchlistPanel>                  │   │
│                   │          <renderScreen()>                  │   │
│                   │            14 Screen Components            │   │
│                   │          <Modals (portals)>                │   │
│                   │      </WatchlistProvider>                  │   │
│                   │    </PortfolioProvider>                    │   │
│                   │  </StrictMode>                             │   │
│                   └──────────────────────────────────────────┘   │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    Data / State Layer                        │   │
│  │  PortfolioContext  WatchlistContext  constants.ts  types.ts │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    External Integrations                     │   │
│  │  Alice Blue Noren WS   Google Gemini AI   Google Fonts CDN  │   │
│  │  Font Awesome CDN      TradingView charts  NSE/BSE URLs      │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Module Map

### Layer 1 — Build & Configuration

| File | Role |
|------|------|
| [vite.config.ts](../vite.config.ts) | Vite 5 build configuration; plugin-react |
| [tsconfig.json](../tsconfig.json) | TypeScript compiler options; excludes `src/` directory |
| [tailwind.config.js](../tailwind.config.js) | Design token definitions; custom fonts, shadows, animations |
| [postcss.config.js](../postcss.config.js) | PostCSS pipeline: Tailwind + Autoprefixer |
| [package.json](../package.json) | Dependencies and npm scripts |
| [.env](..\\.env) | Runtime environment variables (all blank by default) |

### Layer 2 — HTML Shell & CSS Reset

| File | Role |
|------|------|
| [index.html](../index.html) | Single HTML page; CDN fonts + Font Awesome; `<div id="root">` |
| [index.css](../index.css) | Tailwind directives; custom scrollbar styles |

### Layer 3 — Application Entry & Routing

| File | Role |
|------|------|
| [index.tsx](../index.tsx) | ReactDOM.createRoot; wraps App in StrictMode |
| [App.tsx](../App.tsx) | Auth state machine; onboarding flow; screen router (`renderScreen()`) |

### Layer 4 — Domain Model

| File | Role |
|------|------|
| [types.ts](../types.ts) | All TypeScript interfaces, enums, and type unions for the domain |
| [constants.ts](../constants.ts) | Static data: MOCK_STOCKS (50+), MOCK_INDICES, DISCOVER_LISTS, ALICE_BLUE_CREDENTIALS |

### Layer 5 — Utilities

| File | Role |
|------|------|
| [utils/formatters.ts](../utils/formatters.ts) | `formatCurrency`, `formatPercent`, `getInstrumentKey`, `parseInstrumentKey` |

### Layer 6 — Data Hooks

| File | Role |
|------|------|
| [hooks/useMarketData.ts](../hooks/useMarketData.ts) | Market data: Alice Blue WS or 1-second simulation fallback |
| [hooks/useIndexData.ts](../hooks/useIndexData.ts) | Independent 3-second index tick simulation for header |

### Layer 7 — State Contexts

| File | Role |
|------|------|
| [contexts/PortfolioContext.tsx](../contexts/PortfolioContext.tsx) | Portfolio state: balances, positions, orders, GTTs, alerts; trade execution |
| [contexts/WatchlistContext.tsx](../contexts/WatchlistContext.tsx) | Watchlist state: 7 lists, groups, drag-drop, notes, settings, sort, pin |

### Layer 8 — External Services

| File | Role |
|------|------|
| [services/geminiService.ts](../services/geminiService.ts) | Google Gemini AI integration; `summarizeNews()` with graceful degradation |

### Layer 9 — Screen Components (14 total)

| File | Screen Name | Status |
|------|------------|--------|
| [screens/DashboardScreen.tsx](../screens/DashboardScreen.tsx) | Dashboard | Functional |
| [screens/TradeScreen.tsx](../screens/TradeScreen.tsx) | Trade | Functional |
| [screens/LandingScreen.tsx](../screens/LandingScreen.tsx) | Landing / Marketing | Functional |
| [screens/AINewsScreen.tsx](../screens/AINewsScreen.tsx) | AI News | Functional |
| [screens/PortfolioScreen.tsx](../screens/PortfolioScreen.tsx) | Portfolio / Holdings | Functional |
| [screens/OrdersScreen.tsx](../screens/OrdersScreen.tsx) | Orders / GTT / Alerts | Functional |
| [screens/FundsScreen.tsx](../screens/FundsScreen.tsx) | Funds / Token Economy | Functional |
| [screens/BidsScreen.tsx](../screens/BidsScreen.tsx) | Earn Tokens (Bids) | Functional (mock tasks) |
| [screens/ProfileScreen.tsx](../screens/ProfileScreen.tsx) | Profile | Functional (local state) |
| [screens/PricingScreen.tsx](../screens/PricingScreen.tsx) | Pricing / Charges | Static reference |
| [screens/BrokerageCalculatorScreen.tsx](../screens/BrokerageCalculatorScreen.tsx) | Brokerage Calculator | Functional |
| [screens/SellingPressureScreen.tsx](../screens/SellingPressureScreen.tsx) | Selling Pressure AI | Stub |
| [screens/PositionsScreen.tsx](../screens/PositionsScreen.tsx) | Positions | Stub (placeholder only) |
| [screens/CoursesScreen.tsx](../screens/CoursesScreen.tsx) | Courses (marketing) | Static |
| [screens/FeaturesScreen.tsx](../screens/FeaturesScreen.tsx) | Features (marketing) | Static |
| [screens/HowItWorksScreen.tsx](../screens/HowItWorksScreen.tsx) | How It Works (marketing) | Static |

### Layer 10 — Auth Screen Components

| File | Role |
|------|------|
| [screens/auth/WebAuthScreen.tsx](../screens/auth/WebAuthScreen.tsx) | Orchestrates login / signup / TFA sub-screens |
| [screens/auth/WebLoginScreen.tsx](../screens/auth/WebLoginScreen.tsx) | Credential entry (pre-filled with TRDR001 / password123) |
| [screens/auth/WebSignUpScreen.tsx](../screens/auth/WebSignUpScreen.tsx) | 3-step: phone → OTP → 4-digit PIN |
| [screens/auth/WebTfaScreen.tsx](../screens/auth/WebTfaScreen.tsx) | 6-digit 2FA entry (any 6 digits accepted) |

### Layer 11 — UI Component Library

#### Auth & Branding
| File | Role |
|------|------|
| [components/auth/Logo.tsx](../components/auth/Logo.tsx) | SVG logo: two triangles (blue + purple) |

#### Layout
| File | Role |
|------|------|
| [components/layout/WebHeader.tsx](../components/layout/WebHeader.tsx) | Sticky header: index tickers, navigation, market status badge |
| [components/layout/ProfileDropdown.tsx](../components/layout/ProfileDropdown.tsx) | User dropdown: profile link, settings, logout |

#### Common
| File | Role |
|------|------|
| [components/common/DisclaimerModal.tsx](../components/common/DisclaimerModal.tsx) | First onboarding modal; bilingual legal disclaimer |
| [components/common/TrialPlanModal.tsx](../components/common/TrialPlanModal.tsx) | Second onboarding modal; confetti; plan details |
| [components/common/Tooltip.tsx](../components/common/Tooltip.tsx) | Portal-rendered tooltip with viewport edge-detection |

#### Trade — Primary Panels
| File | Role |
|------|------|
| [components/trade/WatchlistPanel.tsx](../components/trade/WatchlistPanel.tsx) | Left panel: watchlist display, search, groups, drag-drop, depth |
| [components/trade/WatchlistTabs.tsx](../components/trade/WatchlistTabs.tsx) | Tab bar for watchlists 1–7; Ctrl+Shift+1-7 shortcuts |
| [components/trade/OrderWindow.tsx](../components/trade/OrderWindow.tsx) | Draggable floating order form; 5 order tabs; market depth side panel |
| [components/trade/ChartPanel.tsx](../components/trade/ChartPanel.tsx) | TradingView lightweight-charts; candlestick + volume; mock historical data |
| [components/trade/ChartWindow.tsx](../components/trade/ChartWindow.tsx) | Floating resizable/draggable window hosting ChartPanel or OptionChainPanel |
| [components/trade/IndicesPanel.tsx](../components/trade/IndicesPanel.tsx) | Full-page index table: Indian (17) and Global markets |
| [components/trade/OptionChainPanel.tsx](../components/trade/OptionChainPanel.tsx) | NSE/BSE option chain: CE/PE table, OI bars, Greeks, expiry selector |

#### Trade — Modals & Menus
| File | Role |
|------|------|
| [components/trade/MarketDepthModal.tsx](../components/trade/MarketDepthModal.tsx) | Full-screen market depth modal with stock switcher |
| [components/trade/ManageWatchlistsModal.tsx](../components/trade/ManageWatchlistsModal.tsx) | Watchlist CRUD modal: create, rename, delete |
| [components/trade/MoreOptionsMenu.tsx](../components/trade/MoreOptionsMenu.tsx) | Portal context menu: pin, chart, GTT, alert, fundamentals links |
| [components/trade/TradeModals.tsx](../components/trade/TradeModals.tsx) | `AlertCreateModal` and `GTTCreateModal` form components |

#### Trade — Watchlist Sub-components
| File | Role |
|------|------|
| [components/trade/watchlist/StockRow.tsx](../components/trade/watchlist/StockRow.tsx) | Individual stock row with price, hover actions, drag handle |
| [components/trade/watchlist/MarketDepthPanel.tsx](../components/trade/watchlist/MarketDepthPanel.tsx) | Inline depth panel within watchlist; price range indicator |
| [components/trade/watchlist/NotesEditor.tsx](../components/trade/watchlist/NotesEditor.tsx) | Auto-sizing textarea for per-stock notes; Ctrl+Enter to save |
| [components/trade/watchlist/WatchlistSettingsPanel.tsx](../components/trade/watchlist/WatchlistSettingsPanel.tsx) | Toggle panel: change type, display columns, sort order |

### Layer 12 — Legacy / Deprecated Files

| File | Status |
|------|--------|
| [src/constants.ts](../src/constants.ts) | Dead code — excluded from `tsconfig.json`; contains hardcoded Alice Blue API credentials |
| [src/hooks/useMarketData.ts](../src/hooks/useMarketData.ts) | Dead code — excluded from `tsconfig.json`; legacy duplicate hook |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Market Data Flow                              │
│                                                                      │
│  ALICE_BLUE_CREDENTIALS (constants.ts)                              │
│       ↓ (userId && apiKey truthy?)                                  │
│  useMarketData.ts ──YES──→ WebSocket (wss://ant.aliceblueonline…)  │
│       └──────NO──→ startMockData() → 1s setInterval random walk    │
│                         ↓                                            │
│                  marketData: Stock[]                                 │
│                         ↓                                            │
│  PortfolioContext.tsx                                               │
│       ├── 1s interval: recalculate position P&L                     │
│       ├── executeTrade() → update virtualBalance + positions        │
│       └── provides: { portfolio, marketData, ... }                  │
│                         ↓                                            │
│  Consumer Components:                                               │
│       DashboardScreen  PortfolioScreen  OrdersScreen                │
│       WatchlistPanel   OrderWindow      ChartPanel                  │
│       StockRow         MarketDepthPanel MarketDepthModal            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       Order Execution Flow                           │
│                                                                      │
│  User clicks B/S in StockRow or OrderWindow                         │
│       ↓                                                             │
│  App.tsx: openOrderWindow(stock, type)                              │
│       ↓                                                             │
│  OrderWindow: user configures qty, price, variety, validity         │
│       ↓ handleSubmit()                                              │
│  PortfolioContext.executeTrade()                                     │
│       ↓ validates: virtualBalance ≥ cost (BUY) / qty ≤ held (SELL) │
│       ↓ updates: virtualBalance, positions[], orderHistory[]        │
│       ↓                                                             │
│  DashboardScreen / PortfolioScreen / OrdersScreen reflect change    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Token Economy Flow                            │
│                                                                      │
│  FundsScreen / BidsScreen                                           │
│       ↓                                                             │
│  addInr(amount)   → portfolio.inrBalance += amount                  │
│  buyNxo(amount)   → inrBalance -= amount; nxoBalance += amount      │
│  convertToVirtual → nxoBalance -= n; virtualBalance += n * 1000     │
│  addReward(n)     → nxoBalance += n  (direct credit)               │
│                                                                      │
│  All balances shown in WebHeader (via usePortfolio)                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Watchlist Data Flow                           │
│                                                                      │
│  WatchlistContext (7 default lists, groups, notes, settings)        │
│       ↓ composite key storage: "EXCHANGE:SYMBOL"                    │
│  WatchlistPanel: reads activeView, groups, stocks                   │
│       ↓ parseInstrumentKey()                                        │
│  getStock(symbol, exchange) from PortfolioContext.marketData        │
│       ↓ live prices                                                  │
│  StockRow: renders with live LTP and change data                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Composite Instrument Key Convention

All watchlist storage uses the format `"EXCHANGE:SYMBOL"` (e.g. `"NSE:TATASTEEL"`, `"BSE:TATASTEEL"`).

- **Creation**: `getInstrumentKey(stock)` → `"${stock.exchange}:${stock.symbol}"`
- **Parsing**: `parseInstrumentKey(key)` → `{ symbol, exchange? }` — handles legacy bare symbol strings
- **Lookup**: `WatchlistContext.getStock(symbol, exchange)` and `PortfolioContext.getStock(symbol, exchange)` both accept optional exchange for disambiguation
- **Rendering**: React list keys always use composite format: `key={`${stock.exchange}:${stock.symbol}`}`

---

## Cross-File Interaction Map

```
App.tsx
  ├── imports: contexts/PortfolioContext, contexts/WatchlistContext
  ├── imports: components/layout/WebHeader
  ├── imports: components/trade/WatchlistPanel, WatchlistTabs, OrderWindow, ChartWindow
  ├── imports: components/common/DisclaimerModal, TrialPlanModal
  ├── imports: components/trade/TradeModals (AlertCreateModal, GTTCreateModal)
  ├── imports: components/trade/MarketDepthModal, MoreOptionsMenu
  └── imports: screens/* (all 14 screens via dynamic renderScreen())

PortfolioContext.tsx
  ├── consumes: hooks/useMarketData
  ├── provides: portfolio state to ALL consumer components
  └── imports: types.ts, constants.ts

WatchlistContext.tsx
  ├── provides: watchlist state to WatchlistPanel, WatchlistTabs, ManageWatchlistsModal
  └── imports: types.ts

hooks/useMarketData.ts
  ├── reads: constants.ALICE_BLUE_CREDENTIALS (via .env vars)
  └── imports: types.ts, constants.MOCK_STOCKS

components/trade/WatchlistPanel.tsx
  ├── consumes: WatchlistContext (all watchlist ops)
  ├── consumes: PortfolioContext (getStock for live prices, positions for holdings badge)
  ├── renders: watchlist/StockRow, watchlist/MarketDepthPanel, watchlist/NotesEditor, watchlist/WatchlistSettingsPanel
  └── emits: onStockSelect, onOrderAction, onCreateGTT, onCreateAlert, onShowDepth

components/trade/OrderWindow.tsx
  ├── consumes: PortfolioContext (executeTrade, portfolio for balance display)
  └── persists: last tab to localStorage (key: travirt_order_settings)

screens/DashboardScreen.tsx
  ├── consumes: PortfolioContext (portfolio, marketData, loading)
  └── imports: constants.MOCK_INDICES (for index cards)

screens/TradeScreen.tsx
  ├── renders: ChartPanel or OptionChainPanel based on viewMode
  └── receives: selectedStock from App.tsx state

services/geminiService.ts
  ├── reads: .env VITE_API_KEY
  └── consumed by: screens/AINewsScreen.tsx
```

---

## Traceability Map

### Business Functions → Files

| Business Function | Primary Files | Supporting Files |
|---|---|---|
| Market data (live/simulated) | `hooks/useMarketData.ts` | `constants.ts` (MOCK_STOCKS), `.env` |
| Virtual trade execution | `contexts/PortfolioContext.tsx` | `types.ts`, `components/trade/OrderWindow.tsx` |
| Portfolio & P&L tracking | `contexts/PortfolioContext.tsx` | `screens/PortfolioScreen.tsx`, `screens/DashboardScreen.tsx` |
| Watchlist management | `contexts/WatchlistContext.tsx` | `components/trade/WatchlistPanel.tsx`, `WatchlistTabs.tsx` |
| Option chain viewer | `components/trade/OptionChainPanel.tsx` | `screens/TradeScreen.tsx`, `ChartWindow.tsx` |
| Charting | `components/trade/ChartPanel.tsx` | `ChartWindow.tsx`, `screens/TradeScreen.tsx` |
| Market depth (inline) | `components/trade/watchlist/MarketDepthPanel.tsx` | `StockRow.tsx`, `WatchlistPanel.tsx` |
| Market depth (modal) | `components/trade/MarketDepthModal.tsx` | `App.tsx` |
| GTT order management | `components/trade/TradeModals.tsx` (GTTCreateModal) | `PortfolioContext.tsx`, `screens/OrdersScreen.tsx` |
| Price alert management | `components/trade/TradeModals.tsx` (AlertCreateModal) | `PortfolioContext.tsx`, `screens/OrdersScreen.tsx` |
| Token economy (INR→NXO→Virtual) | `contexts/PortfolioContext.tsx` | `screens/FundsScreen.tsx`, `screens/BidsScreen.tsx` |
| Brokerage fee calculation | `screens/BrokerageCalculatorScreen.tsx` | `screens/PricingScreen.tsx` |
| AI news summarization | `services/geminiService.ts` | `screens/AINewsScreen.tsx` |
| Authentication (mock) | `screens/auth/WebAuthScreen.tsx` | `App.tsx`, `screens/auth/WebLoginScreen.tsx` |
| Onboarding modals | `components/common/DisclaimerModal.tsx` | `components/common/TrialPlanModal.tsx`, `App.tsx` |
| Index data display | `hooks/useIndexData.ts` | `components/layout/WebHeader.tsx`, `screens/DashboardScreen.tsx`, `components/trade/IndicesPanel.tsx` |
| Notes per stock | `components/trade/watchlist/NotesEditor.tsx` | `contexts/WatchlistContext.tsx`, `WatchlistPanel.tsx` |
| Per-list display settings | `components/trade/watchlist/WatchlistSettingsPanel.tsx` | `contexts/WatchlistContext.tsx` |
| More options / context menu | `components/trade/MoreOptionsMenu.tsx` | `WatchlistPanel.tsx`, `App.tsx` |
| Stock row interactions | `components/trade/watchlist/StockRow.tsx` | `WatchlistPanel.tsx` |

### Workflows → Files

| Workflow | Entry Point | Key Files in Chain |
|---|---|---|
| First visit (unauthenticated) | `App.tsx` (state: `landing`) | `LandingScreen`, `CoursesScreen`, `FeaturesScreen`, `HowItWorksScreen` |
| Registration | `App.tsx` → `WebAuthScreen` | `WebSignUpScreen` (3 steps) → `WebTfaScreen` → authenticated state |
| Login | `App.tsx` → `WebAuthScreen` | `WebLoginScreen` → `WebTfaScreen` → onboarding → `DisclaimerModal` → `TrialPlanModal` |
| Browse & watch stocks | `WatchlistTabs` → `WatchlistPanel` | `StockRow`, `WatchlistSettingsPanel`, `ManageWatchlistsModal` |
| Place virtual trade | `StockRow` (B/S) → `OrderWindow` | `PortfolioContext.executeTrade()` → `DashboardScreen`/`PortfolioScreen` |
| View live chart | `WatchlistPanel` select → `TradeScreen` | `ChartPanel` (lightweight-charts) |
| View option chain | `TradeScreen` tab switch | `OptionChainPanel`, `ChartWindow` |
| Set GTT order | `MoreOptionsMenu` → `GTTCreateModal` | `PortfolioContext.createGTT()` → `OrdersScreen` |
| Set price alert | `MoreOptionsMenu` → `AlertCreateModal` | `PortfolioContext.createAlert()` → `OrdersScreen` |
| Fund account | `FundsScreen` | `PortfolioContext.addInr()` → `buyNxo()` → `convertToVirtual()` |
| Earn tokens | `BidsScreen` | `PortfolioContext.addReward()` |
| Read AI news summary | `AINewsScreen` | `geminiService.summarizeNews()` → `@google/genai` |

---

## Known Issues & Tech Debt (Platform-Wide)

| # | Issue | Severity | Affected Files |
|---|-------|----------|----------------|
| 1 | `WatchlistTabs.tsx` has a local `Tooltip` copy instead of using `components/common/Tooltip` | Low | `WatchlistTabs.tsx` |
| 2 | `MarketDepthModal.tsx` has a second local `Tooltip` copy | Low | `MarketDepthModal.tsx` |
| 3 | `PositionsScreen.tsx` is a stub placeholder | Medium | `PositionsScreen.tsx` |
| 4 | `SellingPressureScreen.tsx` is a partial stub | Medium | `SellingPressureScreen.tsx` |
| 5 | Hardcoded demo credentials in `WebLoginScreen.tsx` | Low (demo only) | `WebLoginScreen.tsx` |
| 6 | `src/constants.ts` contains production Alice Blue API key in plaintext | Critical | `src/constants.ts` (dead file) |
| 7 | `ChartWindow.tsx` uses `alert()` for GTT/Alert/Depth from option chain | Low | `ChartWindow.tsx` |
| 8 | Timeframe toolbar in `ChartPanel.tsx` not wired to data | Low | `ChartPanel.tsx` |
| 9 | All data is ephemeral — no persistence layer | Medium | All contexts |
| 10 | OCO trigger in `GTTCreateModal` sets limit price = trigger price (simplified) | Medium | `TradeModals.tsx` |
| 11 | `ATO (Alert Triggers Order)` feature is stubbed with "coming soon" message | Low | `TradeModals.tsx` |
| 12 | `DashboardScreen` holdings table uses `key={pos.symbol}` (no exchange prefix) | Low | `DashboardScreen.tsx` |

---

## Environment Variables Reference

| Variable | Used In | Purpose |
|----------|---------|---------|
| `VITE_API_KEY` | `services/geminiService.ts` | Google Gemini AI API key |
| `VITE_WS_URL` | `src/constants.ts` (dead file only) | Custom WebSocket broadcast URL |
| `VITE_ALICE_USER_ID` | `constants.ts` | Alice Blue user ID for live feed |
| `VITE_ALICE_API_KEY` | `constants.ts` | Alice Blue API key for live feed |

All four variables are blank by default in `.env`, causing the platform to run entirely in simulation mode.
