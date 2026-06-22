# Entry Points & Shell

---

## index.html

### File Overview
* **File Name**: index.html  
* **File Path**: `/index.html`  
* **Module**: HTML Shell  
* **Layer**: Presentation / Entry  
* **Status**: Active

### Purpose
The single HTML page that Vite serves for all routes. It provides the browser context: viewport meta tag, CDN font imports, Font Awesome icons, and the `<div id="root">` mount point for the React application.

### Business Function
Sets the page title ("TraVirt - Virtual Trading Platform"), loads fonts and icons, and bootstraps the React SPA.

### System Role
The entry point for the browser. Vite's dev server serves this file for every request, and the `<script type="module" src="/index.tsx">` tag triggers the entire React module graph.

### Dependencies
* **External CDN**:
  - Google Fonts: `Exo 2`, `Orbitron`, `Rajdhani` (three custom fonts used by Tailwind config)
  - Font Awesome 6.0 (icons used by virtually every component via `<i className="fas fa-...">`)
* **Internal**: `/index.tsx` (loaded as ES module)

### Inputs
None — served as static HTML.

### Outputs
A rendered React SPA injected into `<div id="root">`.

### Core Components
```html
<body class="dark bg-base">
  <div id="root"></div>
  <script type="module" src="/index.tsx"></script>
</body>
```
The `dark` class on `<body>` activates Tailwind's `darkMode: 'class'` theme permanently. `bg-base` sets the page background to `#0B1B3F` before React renders (prevents flash of white on load).

### Architecture Alignment
Clean post-cleanup state: no legacy AI Studio importmap, no Tailwind CDN, no inline scripts. Follows Vite best practice of a minimal HTML shell with a single module entry point.

### Issues Identified
* Font Awesome is loaded from a CDN (`cdnjs.cloudflare.com`) rather than bundled. This creates a network dependency; if the CDN is unavailable, all icons break. Consider `@fortawesome/react-fontawesome` or self-hosting.
* Google Fonts also requires a CDN connection. In offline or restricted environments, fonts fall back to browser defaults.

### Refactoring Recommendations
Bundle Font Awesome locally or use the React package. Self-host fonts for offline capability.

### Future Enhancements
Add `<meta name="description">` and Open Graph tags for SEO and social sharing of the marketing pages.

---

## index.css

### File Overview
* **File Name**: index.css  
* **File Path**: `/index.css`  
* **Module**: CSS / Styling  
* **Layer**: Presentation  
* **Status**: Active

### Purpose
Global stylesheet. Contains the three Tailwind directive imports and custom scrollbar styles. Injected into every page via `index.tsx`.

### Core Components

**Tailwind Directives:**
```css
@tailwind base;         /* CSS reset + base styles */
@tailwind components;   /* Component layer (empty by default) */
@tailwind utilities;    /* All utility classes */
```

**Custom Scrollbar (`.custom-scrollbar`):**
```css
/* WebKit (Chrome/Edge/Safari) */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--color-base); }
::-webkit-scrollbar-thumb { background: var(--color-overlay); border-radius: 3px; }
/* Firefox */
scrollbar-width: thin;
scrollbar-color: var(--color-overlay) var(--color-base);
```

The `.custom-scrollbar` class is applied to scrollable containers in `WatchlistPanel`, `OrderWindow`, `MarketDepthModal`, `ManageWatchlistsModal`, `OptionChainPanel`, and others.

### Issues Identified
None. Minimal and correct.

---

## index.tsx

### File Overview
* **File Name**: index.tsx  
* **File Path**: `/index.tsx`  
* **Module**: React Entry Point  
* **Layer**: Application  
* **Status**: Active

### Purpose
Creates the React root and mounts `<App>` wrapped in `<React.StrictMode>`. This is the module referenced by `index.html` and processed first by Vite.

### Core Components
```typescript
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

The null-guard on `rootElement` is the only external boundary check in the file — correct practice as this is the sole place where DOM availability cannot be guaranteed at compile time.

### StrictMode Implications
React 18 StrictMode double-invokes effects (`useEffect`, `useState` initializers) in development. This is why `useMarketData.ts` guards against double-starting the simulation interval with a ref check.

### Architecture Alignment
Minimal and correct. Follows React 18 `createRoot` API (replaces legacy `ReactDOM.render`).

---

## App.tsx

### File Overview
* **File Name**: App.tsx  
* **File Path**: `/App.tsx`  
* **Module**: Root Application  
* **Layer**: Application / Routing  
* **Status**: Active

### Purpose
The root React component. Manages authentication state, orchestrates the onboarding modal sequence, handles screen routing, and holds all cross-screen modal state (OrderWindow, MarketDepthModal, ChartWindow, MoreOptionsMenu, GTTCreateModal, AlertCreateModal).

### Business Function
Acts as the application shell and state orchestrator. All user navigation, trade initiation from anywhere in the UI, and modal management flow through this component.

### System Role
Central coordination point between the two global context providers (`PortfolioProvider`, `WatchlistProvider`) and all screen and component children.

### Dependencies
* **Internal**:
  - `contexts/PortfolioContext` — `PortfolioProvider`
  - `contexts/WatchlistContext` — `WatchlistProvider`
  - `components/layout/WebHeader`
  - `components/trade/WatchlistPanel`, `WatchlistTabs`, `OrderWindow`, `ChartWindow`
  - `components/common/DisclaimerModal`, `TrialPlanModal`
  - `components/trade/TradeModals` — `AlertCreateModal`, `GTTCreateModal`
  - `components/trade/MarketDepthModal`, `MoreOptionsMenu`
  - All 14 screen components
  - `utils/formatters` — `getInstrumentKey`
  - `types.ts` — `Screen`, `TradeViewMode`, `Stock`, `TransactionType`, `OrderType`

### Inputs
None (root component).

### Outputs
Full application UI.

### Core Components

**`AuthState` type** (local):
```typescript
type AuthState = 'landing' | 'login' | 'signup' | 'authenticated';
```

**`App` (outer component)**:
- Manages `authState`, `showDisclaimer`, `showTrialModal`
- Renders `LandingScreen` → `WebAuthScreen` → `AppContent` based on auth state
- Shows `DisclaimerModal` immediately after login, then `TrialPlanModal`

**`AppContent` (inner component)**:
- Three-column layout: `WatchlistTabs` + `WatchlistPanel` (left) + main content area (right)
- Holds all floating/modal state: `selectedStock`, `orderWindowState`, `chartWindowStock`, `activeMoreMenu`, `activeGTTModal`, `activeAlertModal`, `marketDepthStock`
- `renderScreen()`: Switch on `activeScreen: Screen` — 14 cases routing to screen components

**`findStockWithFallback()`**:
```typescript
const findStockWithFallback = (symbol: string, exchange?: string): Stock | undefined => {
    // Exchange-aware lookup first, then case-insensitive fallback
    return marketData.find(s => 
        s.symbol.toLowerCase() === symbol.toLowerCase().trim() &&
        (!exchange || s.exchange === exchange)
    ) || marketData.find(s => s.symbol.toLowerCase() === symbol.toLowerCase().trim());
};
```
Used when resolving a watchlist instrument key back to a live `Stock` object.

**`handleAddToWatchlist()`**:
Calls `addStockToWatchlist(getInstrumentKey(stock))` to store in composite key format.

**`Screen` type** (exported):
```typescript
type Screen = 'dashboard' | 'trade' | 'portfolio' | 'orders' | 'funds' | 
              'profile' | 'bids' | 'pricing' | 'brokerageCalculator' | 
              'aiNews' | 'sellingPressure' | 'indices' | 'courses' | 
              'features' | 'howItWorks';
```

### Workflow Integration
Every user action that triggers navigation, opens a modal, or initiates a trade eventually calls a handler defined in `AppContent`. The component tree goes 5 levels deep before reaching leaf UI elements.

### Data Flow
```
User clicks → WatchlistPanel.onOrderAction
           → App.handleOrderAction({ stock, type, price, orderType })
           → setOrderWindowState({ stock, type, price, orderType })
           → <OrderWindow> renders with those props
           → User submits → executeTrade() in PortfolioContext
```

### Intelligence Contribution
None directly. Routes calls to `geminiService` via `AINewsScreen`.

### Key Code Highlights
The `TradeViewMode` type (exported):
```typescript
export type TradeViewMode = 'chart' | 'optionChain';
```
Shared between `App.tsx` (where `TradeScreen` receives it) and `ChartWindow.tsx`.

### Architecture Alignment
The component correctly separates auth concerns (`App`) from application concerns (`AppContent`). The context providers wrap `AppContent`, ensuring all child components have access to global state.

### Issues Identified
* `AppContent` has grown to ~300 lines with many co-located state variables. It is approaching the limit of a manageable component.
* `renderScreen()` is a long switch statement. As screen count grows, this will need to be replaced with a proper routing solution (e.g., React Router).

### Refactoring Recommendations
1. Extract modal management state (`orderWindowState`, `chartWindowStock`, etc.) into a dedicated `useModalState` hook.
2. Replace `renderScreen()` switch with React Router v6 routes.
3. Consider moving `findStockWithFallback` to `utils/formatters.ts` or a dedicated `stockUtils.ts`.

### Future Enhancements
* Add URL-based routing so users can share/bookmark a specific screen or stock chart.
* Add keyboard shortcut global handler (e.g., `Esc` to close all modals, `T` to focus trade screen).
