# Hooks, Contexts & Services

---

## hooks/useMarketData.ts

### File Overview
* **File Name**: useMarketData.ts  
* **File Path**: `/hooks/useMarketData.ts`  
* **Module**: Market Data Hook  
* **Layer**: Data / State  
* **Status**: Active

### Purpose
React hook that manages the lifecycle of market data for the entire application. Provides a single array of live-updating `Stock` objects either from the Alice Blue Noren WebSocket feed (when credentials are configured) or from a local simulation loop (the default).

### Business Function
Serves as the data backbone of the trading platform. Every price displayed in the UI — watchlist prices, chart ticks, portfolio P&L, order book — originates from this hook's `marketData` array.

### System Role
Instantiated exactly once, inside `PortfolioContext`. Its output is distributed to all consumer components via `PortfolioContext`'s value.

### Dependencies
* **Internal**: `types.ts` (Stock, MarketStatus), `constants.ts` (MOCK_STOCKS, ALICE_BLUE_CREDENTIALS)
* **External**: Browser WebSocket API

### Inputs
* `ALICE_BLUE_CREDENTIALS` from `constants.ts` (read from `.env`)
* `MOCK_STOCKS` as initial state

### Outputs
```typescript
{
    marketData: Stock[];        // Live-updating stock array
    loading: boolean;
    isConnected: boolean;
    marketStatus: 'LIVE' | 'SIMULATION' | 'CONNECTING';
}
```

### Core Components

**Connection decision logic:**
```typescript
const { userId, apiKey } = ALICE_BLUE_CREDENTIALS;
// In useEffect:
if (userId && apiKey) {
    connectAliceBlue();
} else {
    startMockData();
}
```

**`startMockData()`** — Simulation mode:
```typescript
const mockIntervalId = window.setInterval(() => {
    setMarketData(prevStocks => prevStocks.map(stock => {
        const volatility = (stock.instrumentType === 'OPTION') ? 0.002 : 0.001;
        const changeFactor = (Math.random() - 0.5) * volatility;
        let newLtp = Math.round(stock.ltp * (1 + changeFactor) * 20) / 20; // Ticks of ₹0.05
        return { ...stock, ltp: newLtp, change: newLtp - stock.prevClose, ... };
    }));
}, 1000);
```
Price simulation features:
- Random walk with ±0.1% volatility (±0.2% for options/futures)
- Minimum tick size: ₹0.05 (standard Indian equity tick)
- Running high/low update
- Volume accumulation
- Market depth bid/ask recalculation (maintains spread relative to new LTP)

**`connectAliceBlue()`** — Live mode:
```typescript
const ws = new WebSocket('wss://ant.aliceblueonline.com/hydrasocket/v2/websocket');
ws.onopen = () => { /* send auth + subscribe messages */ };
ws.onmessage = (event) => { /* parse tick data, update marketData */ };
ws.onerror = () => startMockData(); // Graceful degradation
ws.onclose = () => startMockData();
```
Falls back to simulation on connection error or closure, ensuring the UI never enters a broken state.

### Workflow Integration
1. `PortfolioProvider` mounts → `useMarketData()` called
2. Credential check → simulation starts immediately (or WebSocket attempt)
3. Every 1 second: `setMarketData()` triggers re-render of all consumers
4. `PortfolioContext` receives new `marketData` → recalculates position P&L

### Intelligence Contribution
The simulation engine implements a mean-reverting random walk, which keeps prices in realistic ranges over time rather than drifting to infinity or zero.

### Issues Identified
* `marketDataRef` is maintained in parallel with `marketData` state but is only used within the WebSocket path. If the simulation path ever needs it (e.g., to avoid stale closures in GTT evaluation), it would need to be added there too.
* WebSocket reconnection logic is missing — if the connection drops, it falls back to simulation permanently for that session. No auto-reconnect with exponential backoff.

### Refactoring Recommendations
Add a `reconnectAttempts` counter and exponential backoff reconnect logic before falling back to simulation mode.

---

## hooks/useIndexData.ts

### File Overview
* **File Name**: useIndexData.ts  
* **File Path**: `/hooks/useIndexData.ts`  
* **Module**: Index Ticker Hook  
* **Layer**: Data  
* **Status**: Active

### Purpose
Provides independent 3-second tick simulations for a specified array of index symbols, used by `WebHeader` for the pinned ticker strip.

### Business Function
Keeps header index prices visually live without coupling to the main market data simulation clock.

### Dependencies
* **Internal**: `constants.ts` (MOCK_INDICES or similar index data)

### Outputs
```typescript
{ data: Record<string, IndexQuote>, loading: boolean }
// where IndexQuote: { ltp: number, change: number, changePercent: number }
```

### Core Components
Accepts `symbols: string[]`. Maps each symbol to its initial values from `MOCK_INDICES`, then runs an independent `setInterval` at 3 seconds to apply random walk updates.

### Workflow Integration
Called in `WebHeader.tsx`:
```typescript
const { data } = useIndexData(['NIFTY 50', 'NIFTY BANK', 'SENSEX']);
```

### Issues Identified
The 3-second interval is not synchronized with the 1-second main market data interval. Index values in the header ticker and in `DashboardScreen` IndexCards can diverge because they use different data sources (`useIndexData` vs `MOCK_INDICES` from constants).

### Refactoring Recommendations
Source index data from `PortfolioContext.marketData` (which contains index instruments) rather than maintaining a separate simulation. This would unify all prices.

---

## contexts/PortfolioContext.tsx

### File Overview
* **File Name**: PortfolioContext.tsx  
* **File Path**: `/contexts/PortfolioContext.tsx`  
* **Module**: Portfolio State  
* **Layer**: State / Context  
* **Status**: Active

### Purpose
Global React Context provider for all portfolio-related state. Consumes the `useMarketData` hook and exposes portfolio operations (trade execution, token economy, GTT management, alert management) to the entire component tree.

### Business Function
The central business logic engine of the platform. Manages the three-layer currency system, trade simulation, real-time P&L calculation, and all risk management features (GTT, Alerts).

### System Role
Wraps the entire `AppContent` component tree. All components that need market data or portfolio operations consume this context via `usePortfolio()`.

### Dependencies
* **Internal**: `hooks/useMarketData`, `types.ts`, `constants.ts`
* **External**: React Context API

### Inputs
None (self-seeded from `constants.ts` MOCK_STOCKS and initial balance constants).

### Outputs
Context value with:
```typescript
{
    // Market data
    marketData: Stock[];
    loading: boolean;
    isConnected: boolean;
    marketStatus: MarketStatus;
    
    // Portfolio state
    portfolio: PortfolioState;
    
    // Stock lookup
    getStock: (symbol: string, exchange?: string) => Stock | undefined;
    
    // Trade execution
    executeTrade: (order: TradeOrder) => boolean;
    
    // Token economy
    addInr: (amount: number) => void;
    buyNxo: (amount: number) => void;
    convertNxoToVirtual: (amount: number) => void;
    addReward: (amount: number) => void;
    
    // GTT operations
    createGTT: (params: GTTCreateParams) => void;
    cancelGTT: (id: string) => void;
    
    // Alert operations
    createAlert: (params: AlertCreateParams) => void;
    deleteAlert: (id: string) => void;
}
```

### Core Components

**P&L Update Loop (1-second interval):**
```typescript
useEffect(() => {
    const interval = setInterval(() => {
        setPortfolio(prev => ({
            ...prev,
            positions: prev.positions.map(pos => {
                const stock = getStock(pos.symbol, pos.exchange);
                const ltp = stock?.ltp ?? pos.avgPrice;
                const pnl = (ltp - pos.avgPrice) * pos.quantity;
                const currentValue = ltp * pos.quantity;
                return { ...pos, ltp, pnl, currentValue };
            }),
            totalCurrentValue: /* sum of all position current values */,
            todayPnl: /* sum of all position P&L */,
        }));
    }, 1000);
    return () => clearInterval(interval);
}, [marketData]);
```

**`executeTrade()`:**
```typescript
const executeTrade = (order: TradeOrder): boolean => {
    if (order.transactionType === TransactionType.BUY) {
        const cost = order.price * order.quantity;
        if (portfolio.virtualBalance < cost) return false; // Insufficient funds
        // Deduct balance, update or create position, add to order history
    } else {
        const position = portfolio.positions.find(p => p.symbol === order.symbol);
        if (!position || position.quantity < order.quantity) return false;
        // Add proceeds to balance, reduce or close position
    }
    return true;
};
```

**Token Economy:**
```typescript
addInr: (amount) => setPortfolio(p => ({ ...p, inrBalance: p.inrBalance + amount }))
buyNxo: (amount) => {
    if (portfolio.inrBalance < amount) return;
    setPortfolio(p => ({ ...p, inrBalance: p.inrBalance - amount, nxoBalance: p.nxoBalance + amount }));
}
convertNxoToVirtual: (nxoAmount) => {
    if (portfolio.nxoBalance < nxoAmount) return;
    setPortfolio(p => ({
        ...p,
        nxoBalance: p.nxoBalance - nxoAmount,
        virtualBalance: p.virtualBalance + nxoAmount * 1000
    }));
}
```

**`getStock(symbol, exchange?)`:**
Exchange-aware stock lookup from live `marketData`:
```typescript
return marketData.find(s => 
    s.symbol === symbol && (!exchange || s.exchange === exchange)
);
```

### Workflow Integration
All trade-related UI flows terminate in `executeTrade()`. All balance displays read from `portfolio`. All market prices propagate through `marketData`.

### Intelligence Contribution
The 1-second P&L loop provides real-time profit/loss calculation. Combined with the random walk simulation, positions show realistic P&L fluctuation during the trading session.

### Issues Identified
1. **No persistence** — all state resets on page reload. There is no `localStorage` or backend persistence.
2. **GTT evaluation is not implemented** — GTT orders are stored but never automatically triggered when price crosses the trigger level.
3. **Alert evaluation is not implemented** — alerts are stored but never fire.
4. **Position merging on repeat buy** — the current implementation may not correctly average down/up on multiple buy orders for the same instrument.

### Refactoring Recommendations
1. Add `localStorage` persistence for `portfolio` state (serialize/deserialize on mount/update).
2. Add GTT evaluation inside the 1-second P&L loop: check each ACTIVE GTT against current LTP.
3. Add Alert evaluation in the same loop.

---

## contexts/WatchlistContext.tsx

### File Overview
* **File Name**: WatchlistContext.tsx  
* **File Path**: `/contexts/WatchlistContext.tsx`  
* **Module**: Watchlist State  
* **Layer**: State / Context  
* **Status**: Active

### Purpose
Global React Context provider for all watchlist-related state. Manages 7 default watchlists with groups, stock ordering, drag-and-drop, notes, display settings, sort preferences, and pinned header items.

### Business Function
Enables traders to organise their universe of stocks into personalised, named lists with custom groupings, coloured sections, notes, and live-price displays. The watchlist is the primary navigation tool for the platform.

### System Role
Wraps `AppContent` alongside `PortfolioContext`. Consumed by `WatchlistPanel`, `WatchlistTabs`, `ManageWatchlistsModal`, `WebHeader` (pinned items), and `NotesEditor`.

### Dependencies
* **Internal**: `types.ts` (Watchlist, WatchlistGroup, WatchlistSettings, SortByType)

### Outputs
Context value (20+ operations):
```typescript
{
    watchlists: Watchlist[];
    activeView: ActiveView;         // { type: 'watchlist', id: number } | { type: 'discover', list: DiscoverList }
    pinnedItems: string[];          // Symbol keys pinned to header ticker
    
    // Navigation
    setActiveView: (view: ActiveView) => void;
    
    // Watchlist CRUD
    addWatchlist: (name: string) => void;
    removeWatchlist: (id: number) => void;
    updateWatchlistName: (id: number, name: string) => void;
    
    // Stock management
    addStockToWatchlist: (instrumentKey: string, watchlistId?: number) => void;
    removeStockFromWatchlist: (instrumentKey: string, watchlistId?: number) => void;
    reorderStocks: (watchlistId: number, newOrder: string[]) => void;
    
    // Group management
    addGroup: (watchlistId: number, name: string, color: string) => void;
    removeGroup: (watchlistId: number, groupId: string) => void;
    renameGroup: (watchlistId: number, groupId: string, name: string) => void;
    toggleGroupCollapse: (watchlistId: number, groupId: string) => void;
    toggleGroupMaximize: (watchlistId: number, groupId: string) => void;
    moveGroupUp: (watchlistId: number, groupId: string) => void;
    moveGroupDown: (watchlistId: number, groupId: string) => void;
    assignStockToGroup: (watchlistId: number, symbol: string, groupId: string) => void;
    
    // Settings & Sort
    updateSettings: (watchlistId: number, settings: Partial<WatchlistSettings>) => void;
    sortAllAssetsInWatchlist: (watchlistId: number, sortBy: SortByType) => void;
    
    // Notes
    updateNote: (watchlistId: number, symbol: string, note: string) => void;
    deleteNote: (watchlistId: number, symbol: string) => void;
    
    // Pin
    pinItem: (symbol: string, slot: number) => void;
}
```

**`ActiveView` union type:**
```typescript
type ActiveView = { type: 'watchlist'; id: number } | { type: 'discover'; list: DiscoverList };
```

**Default watchlist seeds:**
- Watchlist 5: `['NSE:KOTAKBANK', 'NSE:HDFCBANK', 'NSE:BHARTIARTL', 'NSE:EICHERMOT']`
- Watchlist 6: `['NSE:TATASTEEL', 'NSE:TCS', 'NSE:TECHM', 'NSE:TITAN']`

**`sortAllAssetsInWatchlist()`:**
Sorts the `stocks` array of the target watchlist:
- `%`: by `|changePercent|` descending
- `LTP`: by price descending
- `A-Z`: alphabetically by symbol
- `EXCH`: by exchange string, then symbol

### Issues Identified
1. No `localStorage` persistence — watchlist customisation resets on page reload.
2. `pinnedItems` is a flat array of 2 slots; slot semantics are implicit (slot 1 = index 0, slot 2 = index 1).
3. Group drag-and-drop reordering in `WatchlistPanel` uses the context's `moveGroupUp`/`moveGroupDown` helpers, but stock reorder uses a direct `reorderStocks` call with the full new order array — inconsistent APIs.

### Refactoring Recommendations
1. Persist watchlist state to `localStorage`.
2. Replace the `moveGroupUp`/`moveGroupDown` pair with a single `reorderGroups(watchlistId, newGroupOrder)` function consistent with `reorderStocks`.

---

## services/geminiService.ts

### File Overview
* **File Name**: geminiService.ts  
* **File Path**: `/services/geminiService.ts`  
* **Module**: AI Service  
* **Layer**: Service / Integration  
* **Status**: Active (gracefully degraded when no API key)

### Purpose
Provides a thin wrapper around the Google Gemini AI API. Currently exposes a single function `summarizeNews()` that condenses an array of news headlines into a short AI-generated paragraph.

### Business Function
Enhances the AI News screen with intelligent content summarization, allowing traders to quickly grasp market sentiment from multiple headlines.

### System Role
Called exclusively by `AINewsScreen.tsx` on mount. Uses the `@google/genai` SDK.

### Dependencies
* **External**: `@google/genai` ^1.0.0
* **Internal**: `.env` VITE_API_KEY

### Core Components

**Conditional initialization (prevents crash without API key):**
```typescript
const API_KEY = import.meta.env.VITE_API_KEY;
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;
```

**`summarizeNews(headlines: string[]): Promise<string>`:**
```typescript
export const summarizeNews = async (headlines: string[]): Promise<string> => {
    if (!ai) return "AI summary unavailable. Please configure VITE_API_KEY.";
    
    const prompt = `Summarize these market news headlines in 2-3 sentences: ${headlines.join('. ')}`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
    });
    return response.text ?? "Could not generate summary at this time.";
};
```

### Workflow Integration
```
AINewsScreen mounts
  → calls summarizeNews(mockHeadlines) on mount
  → sets loading state
  → displays skeleton while awaiting
  → renders Gemini summary + raw headlines
```

### Intelligence Contribution
Direct AI integration for market news analysis. The Gemini model synthesises multiple news items into actionable sentiment.

### Issues Identified
* Error handling is absent — if the Gemini API returns an error (rate limit, network failure), the promise rejects and the `AINewsScreen` will crash unless it wraps the call in a try/catch.
* The model is hardcoded as `'gemini-2.0-flash'`. If the model is deprecated, the service will silently fail.
* `mockHeadlines` is hardcoded in `AINewsScreen.tsx` — there is no real news feed integration.

### Refactoring Recommendations
1. Add try/catch in `summarizeNews()` with a user-friendly error return.
2. Accept the model name as a parameter with a sensible default.
3. Add a real news API (e.g., NewsAPI, Moneycontrol scraper) to replace mock headlines.
