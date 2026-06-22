# Domain Model — Types, Constants & Utilities

---

## types.ts

### File Overview
* **File Name**: types.ts  
* **File Path**: `/types.ts`  
* **Module**: Domain Model  
* **Layer**: Core  
* **Status**: Active

### Purpose
Defines every TypeScript interface, enum, and type alias used throughout the TraVirt platform. Acts as the single source of truth for the data contract across all layers — hooks, contexts, components, screens, and services.

### Business Function
Encodes the Indian financial market domain model: instruments, orders, positions, risk triggers (GTT), watchlists, and the token economy.

### System Role
Imported by every file that works with market data or portfolio state. No runtime behaviour — compile-time type definitions only.

### Dependencies
None (pure type file).

### Core Components

**Market Data Types:**
```typescript
interface DepthLevel {
    price: number;
    orders: number;
    quantity: number;
}

interface MarketDepth {
    bids: DepthLevel[];   // Up to 20 levels
    asks: DepthLevel[];   // Up to 20 levels
}

interface Stock {
    symbol: string;           // e.g. "TATASTEEL"
    name: string;             // e.g. "Tata Steel Ltd"
    exchange: string;         // "NSE" | "BSE" | "NFO" | "INDEX"
    instrumentType: InstrumentType;
    ltp: number;              // Last Traded Price
    change: number;           // Absolute change from prev close
    changePercent: number;    // Percentage change
    open: number;
    high: number;
    low: number;
    prevClose: number;
    marketDepth: MarketDepth;
    // Optional fields
    bid?: number;
    ask?: number;
    volume?: number;
    avgTradePrice?: number;
    lastTradedQuantity?: number;
    lastTradedAt?: string;
    lowerCircuit?: number;
    upperCircuit?: number;
    // F&O fields
    underlying?: string;
    expiryDate?: string;
    strikePrice?: number;
    optionType?: 'CE' | 'PE';
}
```

**Portfolio Types:**
```typescript
interface Position {
    symbol: string;
    exchange: string;
    quantity: number;
    avgPrice: number;
    ltp: number;
    pnl: number;
    investedValue: number;
    currentValue: number;
}

interface Order {
    id: string;
    symbol: string;
    exchange: string;
    transactionType: TransactionType;
    orderType: OrderType;
    variety: OrderVariety;
    quantity: number;
    price: number;
    status: OrderStatus;
    timestamp: string;
    validity: OrderValidity;
    disclosedQuantity?: number;
    triggerPrice?: number;
    tag?: string;
}

interface PortfolioState {
    inrBalance: number;        // Layer 1: Real Indian Rupees
    nxoBalance: number;        // Layer 2: NXO tokens (1 INR = 1 NXO)
    virtualBalance: number;    // Layer 3: Virtual trading funds (1 NXO = 1000 virtual)
    totalInvested: number;
    totalCurrentValue: number;
    todayPnl: number;
    positions: Position[];
    orderHistory: Order[];
    gttOrders: GTTOrder[];
    alerts: Alert[];
}
```

**GTT (Good Till Triggered) Types:**
```typescript
interface GTTOrder {
    id: string;
    symbol: string;
    transactionType: TransactionType;
    triggerType: GTTTriggerType;  // SINGLE | OCO
    quantity: number;
    status: GTTStatus;
    triggerPrice?: number;        // SINGLE trigger
    limitPrice?: number;          // SINGLE limit
    stoplossTriggerPrice?: number; // OCO stoploss
    stoplossLimitPrice?: number;
    targetTriggerPrice?: number;   // OCO target
    targetLimitPrice?: number;
    createdAt: string;
    expiryDate: string;
}
```

**Alert Types:**
```typescript
interface Alert {
    id: string;
    symbol: string;
    property: AlertProperty;   // LTP | HIGH | LOW | OPEN | CLOSE | CHANGE | CHANGE_PERCENT | VOLUME
    operator: AlertOperator;   // >= | <= | = | > | <
    value: number;
    type: AlertType;           // ALERT_ONLY | ATO
    status: AlertStatus;       // ACTIVE | TRIGGERED | EXPIRED
    createdAt: string;
}
```

**Watchlist Types:**
```typescript
interface WatchlistSettings {
    changeType: 'close' | 'open';
    showOptions: {
        priceChange: boolean;
        priceChangePercent: boolean;
        priceDirection: boolean;
        holdings: boolean;
        notes: boolean;
        groupColors: boolean;
    };
    sortBy: SortByType;
}

interface WatchlistGroup {
    id: string;
    name: string;
    color: string;
    isCollapsed: boolean;
    isMaximized: boolean;
}

interface Watchlist {
    id: number;
    name: string;
    stocks: string[];    // Stored as "EXCHANGE:SYMBOL" composite keys
    groups: WatchlistGroup[];
    stockGroups: Record<string, string>;  // symbol → groupId
    settings: WatchlistSettings;
    notes?: Record<string, string>;
    pinnedItems?: string[];
}
```

**Key Enums:**
```typescript
enum InstrumentType { EQUITY = 'EQUITY', INDEX = 'INDEX', FUTURE = 'FUTURE', OPTION = 'OPTION' }
enum TransactionType { BUY = 'BUY', SELL = 'SELL' }
enum OrderType { MARKET = 'MARKET', LIMIT = 'LIMIT', SL = 'SL', SL_M = 'SL-M' }
enum OrderVariety { REGULAR = 'REGULAR', AMO = 'AMO', COVER = 'CO', ICEBERG = 'ICEBERG', AUCTION = 'AUCTION' }
enum OrderValidity { DAY = 'DAY', IOC = 'IOC', MINUTES = 'MINUTES' }
enum GTTTriggerType { SINGLE = 'SINGLE', OCO = 'OCO' }
enum GTTStatus { ACTIVE = 'ACTIVE', TRIGGERED = 'TRIGGERED', CANCELLED = 'CANCELLED', EXPIRED = 'EXPIRED' }
enum AlertProperty { LTP = 'LTP', HIGH = 'HIGH', LOW = 'LOW', OPEN = 'OPEN', CLOSE = 'CLOSE', CHANGE = 'CHANGE', CHANGE_PERCENT = 'CHANGE_PERCENT', VOLUME = 'VOLUME' }
enum AlertOperator { GTE = '>=', LTE = '<=', EQ = '=', GT = '>', LT = '<' }
enum AlertType { ALERT_ONLY = 'ALERT_ONLY', ATO = 'ATO' }
enum AlertStatus { ACTIVE = 'ACTIVE', TRIGGERED = 'TRIGGERED', EXPIRED = 'EXPIRED' }
type MarketStatus = 'LIVE' | 'SIMULATION' | 'CONNECTING';
type SortByType = '%' | 'LTP' | 'A-Z' | 'EXCH';
```

### Issues Identified
* `Stock.exchange` is typed as `string` rather than `'NSE' | 'BSE' | 'NFO' | 'INDEX' | 'MCX'` — a union type would prevent typos and enable exhaustive checks.
* `WatchlistGroup.color` is typed as `string` — could be a union of the available colour options to prevent invalid values.

### Refactoring Recommendations
Narrow the `exchange` field to a string literal union. Add a `TickData` type (currently only in `src/hooks/useMarketData.ts`) to the canonical type file.

---

## constants.ts

### File Overview
* **File Name**: constants.ts  
* **File Path**: `/constants.ts`  
* **Module**: Static Data  
* **Layer**: Core  
* **Status**: Active

### Purpose
Provides all static mock data and configuration constants used during simulation: 50+ instrument definitions, index data, discover screener lists, and Alice Blue credentials (read from environment variables).

### Business Function
Seeds the platform with realistic Indian market instruments so the UI is immediately usable without a live data feed. Defines the full mock trading universe.

### System Role
Imported by `useMarketData.ts` (MOCK_STOCKS, ALICE_BLUE_CREDENTIALS), `PortfolioContext.tsx` (initial state), `DashboardScreen.tsx` (MOCK_INDICES), `WatchlistPanel.tsx` (DISCOVER_LISTS, CONSTITUENTS_MAP), and `IndicesPanel.tsx` (INDIAN_INDICES_DATA, GLOBAL_INDICES_DATA).

### Dependencies
* **Internal**: `types.ts`
* **External**: `import.meta.env` (Vite environment variables)

### Core Components

**ALICE_BLUE_CREDENTIALS** (security-fixed):
```typescript
export const ALICE_BLUE_CREDENTIALS = {
    userId: import.meta.env.VITE_ALICE_USER_ID || '',
    apiKey: import.meta.env.VITE_ALICE_API_KEY || '',
};
```
Empty strings cause `useMarketData.ts` to skip WebSocket and use simulation.

**generateStockDetails()** — helper that enriches a partial stock with:
- 20-level market depth (random bid/ask spread)
- Volume (random 100k–5.1M)
- Circuit limits (±10% of prevClose)
- avgTradePrice, lastTradedQuantity, lastTradedAt

**MOCK_STOCKS** — 50+ instruments across NSE + BSE including:
- Dual-listed stocks: TATASTEEL, TCS, RELIANCE, HDFCBANK, INFY, AXISBANK (both NSE and BSE)
- F&O instruments: NIFTYFUT, BANKNIFTYFUT, RELIANCECE18000, TATASTEEL-PE110
- Commodities: CRUDEOILFUT, GOLDFUT, SILVERFUT

**MOCK_INDICES** — 3 overview assets for DashboardScreen IndexCards:
```typescript
{ symbol: 'NIFTY 50', history: [...20 data points...] }
{ symbol: 'NIFTY BANK', history: [...] }
{ symbol: 'SENSEX', history: [...] }
```
Each has a 20-point history array for the Recharts AreaChart sparkline.

**INDIAN_INDICES_DATA** — 17 Indian indices for IndicesPanel:
Nifty 50, Nifty Bank, Sensex, Nifty IT, Nifty Pharma, Nifty FMCG, Nifty Metal, Nifty Auto, Nifty Realty, Nifty Energy, Nifty Midcap 100, Nifty Smallcap 100, BSE Midcap, BSE Smallcap, Nifty PSU Bank, Nifty Fin Services, Nifty Media.

**GLOBAL_INDICES_DATA** — 15 global indices including Dow Jones, NASDAQ, S&P 500, FTSE, Nikkei, Hang Seng, DAX, CAC 40, Shanghai Composite, ASX 200, Sensex, KOSPI, BOVESPA, TSX, Straits Times.

**DISCOVER_LISTS** — screener presets:
`52_WEEK_HIGH`, `52_WEEK_LOW`, `VOLUME_SHOCKERS`, `UPPER_CIRCUIT`, `LOWER_CIRCUIT`, `BULK_DEALS`, `BLOCK_DEALS`

**CONSTITUENTS_MAP** — maps predefined list names to arrays of instrument symbols for `PredefinedListPanel` in `WatchlistPanel`.

**Token Economy Constants:**
```typescript
export const INITIAL_INR_BALANCE = 0;
export const INITIAL_NXO_BALANCE = 0;
export const INITIAL_VIRTUAL_BALANCE = 0;
```

### Issues Identified
* All market data (prices, OI, volumes) is hardcoded. Prices only become "live" after `useMarketData`'s simulation loop starts applying random walks — the initial values are fixed.
* The F&O data in MOCK_STOCKS uses simplified naming conventions that may not match NSE's actual segment codes (NFO).

### Refactoring Recommendations
Split into separate files: `mockStocks.ts`, `mockIndices.ts`, `discoverLists.ts`. This prevents a single large file and allows tree-shaking of unused data sets.

---

## utils/formatters.ts

### File Overview
* **File Name**: formatters.ts  
* **File Path**: `/utils/formatters.ts`  
* **Module**: Utility — Formatting  
* **Layer**: Utility  
* **Status**: Active

### Purpose
Pure utility functions for displaying financial data in Indian locale format and for handling the composite instrument key convention.

### Business Function
Ensures consistent, locale-correct formatting of currency (Indian Rupee) and percentages throughout the UI. Provides the canonical implementation of the instrument key encoding scheme.

### System Role
Imported by virtually every component that renders prices, change figures, or interacts with watchlist storage.

### Dependencies
None (pure functions).

### Core Components

**`formatCurrency(value: number, maxFractionDigits?: number): string`**
```typescript
return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: maxFractionDigits ?? 2,
}).format(value);
// e.g. 23456.78 → "₹23,456.78"
```
Uses Indian number grouping (2-2-3 from right) and INR symbol.

**`formatPercent(value: number): string`**
```typescript
return new Intl.NumberFormat('en-IN', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).format(value);
// e.g. 0.0234 → "2.34%"
// NOTE: Input is a decimal fraction (0.01 = 1%), not a percentage (1 = 1%)
```
Input convention: callers must divide by 100. e.g. `formatPercent(stock.changePercent / 100)`.

**`getInstrumentKey(stock: Stock): string`**
```typescript
return `${stock.exchange}:${stock.symbol}`;
// e.g. { exchange: 'NSE', symbol: 'TATASTEEL' } → "NSE:TATASTEEL"
```
Canonical method to generate composite watchlist storage keys.

**`parseInstrumentKey(key: string): { symbol: string; exchange?: string }`**
```typescript
const parts = key.split(':');
if (parts.length === 2) return { exchange: parts[0], symbol: parts[1] };
return { symbol: key }; // Legacy bare-symbol fallback
```
Handles both modern composite keys and legacy bare symbol strings stored in older watchlist entries.

### Workflow Integration
```
WatchlistContext stores keys as "NSE:TATASTEEL"
       ↓ WatchlistPanel calls parseInstrumentKey()
       ↓ gets { symbol: "TATASTEEL", exchange: "NSE" }
       ↓ calls getStock("TATASTEEL", "NSE") from PortfolioContext
       ↓ returns live Stock object
       ↓ StockRow renders formatCurrency(stock.ltp)
```

### Issues Identified
* `formatPercent` expects a decimal fraction but several call sites pass a raw percentage and divide by 100 at the call site — this is inconsistent. Some components call `formatPercent(stock.changePercent / 100)` while others use `${stock.changePercent.toFixed(2)}%` directly.
* No `formatNumber()` utility for volume display (several components use `.toLocaleString('en-IN')` inline).

### Refactoring Recommendations
1. Add a `formatVolume(value: number): string` helper to centralise volume formatting.
2. Consider renaming `formatPercent` to `formatDecimalAsPercent` to clarify the input convention, or change the input to accept raw percentage values.
