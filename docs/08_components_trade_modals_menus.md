# UI Components — Trade Modals, Menus & Sub-components

---

## components/trade/OptionChainPanel.tsx

### File Overview
* **File Name**: OptionChainPanel.tsx  
* **File Path**: `/components/trade/OptionChainPanel.tsx`  
* **Module**: Options Chain Viewer  
* **Layer**: Presentation / Component  
* **Status**: Active (simulated data)

### Purpose
Renders the full options chain for a given underlying instrument. Displays a symmetric strike price table with Call (CE) and Put (PE) data on either side, supporting two view modes: Open Interest (OI) bars + change, or Greeks (Delta, Theta, Gamma, Vega, IV).

### Business Function
Options analysis tool. Allows traders to assess volatility, identify max-pain strike prices (via OI distribution), and study greeks for risk management before placing options trades.

### System Role
Rendered by `TradeScreen` and `ChartWindow` when the user switches to the Option Chain tab. Receives underlying price from the parent and generates mock option data.

### Dependencies
* **Internal**: `types.ts` (Stock, InstrumentType, TransactionType, OrderType), `utils/formatters`, `components/common/Tooltip`

### Inputs
```typescript
interface OptionChainPanelProps {
    underlyingSymbol: string;
    underlyingLtp: number;
    exchange?: string;           // 'NSE' | 'BSE' | 'INDEX'
    onOrderAction: (action) => void;
    onAddToWatchlist: (stock: Stock) => void;
    onChartSelect: (stock: Stock) => void;
    onCreateGTT: (symbol: string) => void;
    onCreateAlert: (symbol: string) => void;
    onShowDepth: (symbol: string) => void;
}
```

### Core Components

**`GreekStock` extended interface:**
```typescript
interface GreekStock extends Stock {
    oi: number;         // Open Interest (lakhs)
    oiChange: number;   // OI change %
    iv: number;         // Implied Volatility
    delta: number;
    theta: number;
    gamma: number;
    vega: number;
}
```

**Strike list generation (stable):**
```typescript
const generateStrikeList = (centerStrike: number, underlying: string): number[] => {
    const step = underlying.includes('BANK') ? 100 : 50; // BankNifty has 100 strikes
    // 12 strikes above + ATM + 12 strikes below = 25 total
    return Array.from({ length: 25 }, (_, i) => centerStrike + (i - 12) * step);
};
```

**Auto-center on first price (one-time):**
```typescript
const hasAutocenteredRef = useRef(false);
useEffect(() => {
    if (underlyingLtp > 0 && !hasAutocenteredRef.current) {
        const step = underlyingSymbol.includes('BANK') ? 100 : 50;
        const calculatedCenter = Math.round(underlyingLtp / step) * step;
        setCenterStrike(calculatedCenter);
        setStrikeList(generateStrikeList(calculatedCenter, underlyingSymbol));
        hasAutocenteredRef.current = true; // Prevent re-centering on every tick
    }
}, [underlyingLtp, underlyingSymbol]);
```
The `hasAutocenteredRef` prevents the chain from re-centering every time the underlying price ticks, which would cause the user's scroll position to reset.

**`createOptionStock()` — mock option data:**
```typescript
// Seed-based determinism prevents randomness on each render
const random = (seed + strike * (isCE ? 1 : 2)) % 1000 / 1000;

// Black-Scholes-simplified premium calculation:
const intrinsicValue = Math.max(0, isCE ? underlyingLtp - strike : strike - underlyingLtp);
const timeValue = underlyingLtp * 0.005;
const premium = intrinsicValue + timeValue + (random * 5);

// Simplified delta calculation:
const moneyness = distance / underlyingLtp;
const delta = isCE ? 0.5 + moneyness * 2 : -0.5 + moneyness * 2;
const boundedDelta = Math.max(-1, Math.min(1, delta));
```
The seed is fixed per session (`seedRef.current = Math.floor(Math.random() * 10000)`) so premium values are stable during the session but differ between sessions.

**ATM row highlighting:**
```typescript
const isATM = Math.abs(row.strike - underlyingLtp) < (underlyingSymbol.includes('BANK') ? 50 : 25);
const rowBg = isATM ? 'bg-yellow-50 dark:bg-yellow-500/10' : 'hover:bg-gray-50 dark:hover:bg-overlay';
```

**OI bar visualisation:**
```typescript
const ceOiWidth = (row.ce.oi / maxOI) * 100;
const peOiWidth = (row.pe.oi / maxOI) * 100;
// Red bar behind CE OI, green bar behind PE OI (convention: CE = call = seller pressure = red)
<div className="absolute bg-red-500/10" style={{ width: `${ceOiWidth}%` }} />
```

**External exchange link:**
```typescript
// NSE
`https://www.nseindia.com/option-chain?symbol=${encodeURIComponent(nseSymbol)}`
// BSE (SENSEX special case)
`https://www.bseindia.com/sensex/option-chain`
```

**`OptionRowActions`** — hover-visible row action buttons:
B (Buy), S (Sell), Depth, Chart, More — appear on hover via `group/cell:opacity-100`.

**More menu:**
Floating menu at clicked coordinates; items: Chart, Create GTT, Create Alert, Market Depth, Add to Market Watch.

### Key Code Highlights
**Expiry selector:**
```typescript
const expiries = ['25 Nov (Today)', '30 Dec (1 month)', '27 Jan (2 months)', '24 Feb (3 months)'];
// Static — changing expiry does not reload option data
```
The active expiry UI is rendered but does not actually change the underlying data (all mock data ignores expiry).

**View mode toggle:**
```typescript
const [viewMode, setViewMode] = useState<'OI' | 'Greeks'>('OI');
// Table headers and column content change based on viewMode
// Greeks column shows new badge: <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full"/>
```

### Issues Identified
1. Mock option premiums do not use real Black-Scholes or any market-calibrated model — they are for display only.
2. Expiry selector is cosmetic — changing expiry does not regenerate strikes or premiums.
3. "Basket" toggle is rendered but non-functional (no basket order system exists).
4. Settings button in header is a no-op.
5. All `GreekStock` objects have `exchange: 'NFO'` hardcoded — BSE options should use `'BFO'`.

---

## components/trade/MarketDepthModal.tsx

### File Overview
* **File Name**: MarketDepthModal.tsx  
* **File Path**: `/components/trade/MarketDepthModal.tsx`  
* **Module**: Market Depth Modal  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
Full-screen portal modal for detailed market depth analysis. Provides the complete 5–20 level bid/ask order book, a visual price range indicator, OHLCV stats, circuit limits, and quick BUY/SELL/GTT action buttons. Also allows switching to a different stock via search.

### Business Function
Enables deep order book analysis — crucial for understanding liquidity and price discovery around current market prices. The inline stock switcher means users can compare depth across instruments without closing the modal.

### System Role
Instantiated by `App.tsx` when `marketDepthStock` state is set. Rendered as a portal to `document.body`.

### Dependencies
* **Internal**: `types.ts` (Stock, TransactionType, OrderType, DepthLevel), `utils/formatters`
* **External**: React `createPortal`

### Core Components

**Live data subscription:**
```typescript
useEffect(() => {
    const updatedStock = marketData.find(s => s.symbol === currentStock.symbol);
    if (updatedStock) setCurrentStock(updatedStock);
}, [marketData, currentStock.symbol]);
```
Subscribes to `marketData` prop updates to keep the displayed prices current.

**Local `Tooltip` copy** (duplicate of `components/common/Tooltip.tsx`):
A simpler version without edge detection. Should be replaced with the shared import.

**`PriceRangeIndicator`:**
```typescript
const ltpPercent = ((ltp - low) / (high - low)) * 100; // Clamped 0–100
// LTP marker: blue dot with glow
// Open price marker: grey dot
// High/Low labels at ends of the track
```

**`DepthRow`** — clickable order book row:
```typescript
// Clicking a bid row → initiates SELL at that price
// Clicking an ask row → initiates BUY at that price
const handleRowClick = () => {
    const type = side === 'bid' ? TransactionType.SELL : TransactionType.BUY;
    onOrderAction({ stock: currentStock, type, price: level.price, orderType: OrderType.LIMIT });
};
```
Quantity bars fill from the right (bids) or left (asks) based on proportion of max depth quantity.

**Depth toggle:**
```typescript
const [showFullDepth, setShowFullDepth] = useState(false);
const depth = showFullDepth ? 20 : 5; // Chevron button toggles 5 ↔ 20 levels
```

**Stats panel:**
Volume, Avg Price, Lower Circuit, Upper Circuit, LTQ (Last Traded Quantity), LTT (Last Traded Time)

**In-modal stock search:**
```typescript
const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    return marketData.filter(s =>
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 7);
}, [searchQuery, marketData]);
```

### Issues Identified
1. Local `Tooltip` copy — replace with shared component.
2. The search only searches by symbol/name, not exchange — two stocks with the same symbol on NSE/BSE could both appear; selecting either one sets `currentStock` to a single `Stock` object.

---

## components/trade/ManageWatchlistsModal.tsx

### File Overview
* **File Name**: ManageWatchlistsModal.tsx  
* **File Path**: `/components/trade/ManageWatchlistsModal.tsx`  
* **Module**: Watchlist Management Modal  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
CRUD interface for watchlist management: view all watchlists (favourites 1–7 and others), create new lists, rename existing ones (inline edit), and delete lists.

### Business Function
Lets traders organise and maintain their watchlist collection without leaving the trade screen.

### System Role
Triggered by `Ctrl+Shift+K` in `WatchlistTabs` or via a manage button. Rendered as a portal to `document.body`.

### Dependencies
* **Internal**: `contexts/WatchlistContext`, `types.ts` (Watchlist)
* **External**: React `createPortal`

### Core Components

**`NewListModal`** — nested portal modal:
```typescript
// Autofocuses input on mount; creates watchlist on form submit
<form onSubmit={handleSubmit}>
    <input ref={inputRef} value={name} onChange={...} />
    <button type="submit" disabled={!name.trim()}>Create</button>
</form>
```
Renders inside its own `createPortal(…, document.body)` at `z-[60]`.

**`WatchlistRow`** — per-list CRUD row:
```typescript
{isEditing ? (
    <input onBlur={handleSave} onKeyDown={e => e.key === 'Enter' && handleSave()} />
) : (
    <span>{wl.name}</span>
)}
// Hover reveals edit (pencil) and delete (trash) icon buttons
```

**Section separation:**
```typescript
const favoriteLists = watchlists.filter(w => w.id <= 7);   // Fixed slots 1-7
const otherLists = watchlists.filter(w => w.id > 7);        // User-created extras
```

**Search field:**
Rendered with the `Ctrl+Shift+K` shortcut hint but not wired to actual filter logic — typing in the search does nothing.

### Issues Identified
1. The search input in the header is decorative — no filtering implemented.
2. Deleting a watchlist does not confirm with the user if it contains stocks.
3. New list creation generates sequential IDs (incrementing from max existing ID) — this could cause ID conflicts if lists are deleted and new ones created.

---

## components/trade/MoreOptionsMenu.tsx

### File Overview
* **File Name**: MoreOptionsMenu.tsx  
* **File Path**: `/components/trade/MoreOptionsMenu.tsx`  
* **Module**: Context Menu  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
Portal-rendered context menu that appears when the user clicks the `•••` (more) button on a `StockRow`. Provides 10 action items: pin to header, notes, chart (TradingView), option chain, GTT, alert, market depth, add to basket, fundamentals (TradingView), technicals (TradingView).

### Business Function
Central action hub for any instrument. Provides one-click access to the most common trader workflows without navigating away from the watchlist.

### System Role
Instantiated by `WatchlistPanel` or `OptionChainPanel` when `activeMoreMenu` state is set. Portal to `document.body`. Closes on `mouseLeave`.

### Dependencies
* **Internal**: `types.ts` (Stock)
* **External**: React `createPortal`, `window.open()` for external links

### Core Components

**Viewport-aware positioning:**
```typescript
useLayoutEffect(() => {
    const triggerRect = triggerEl.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    
    let top = triggerRect.bottom + 4;
    let flipped = false;
    
    if (top + menuRect.height > window.innerHeight) {
        top = triggerRect.top - menuRect.height - 4;
        flipped = true;
    }
    
    setIsFlipped(flipped);
    setStyle({ position: 'fixed', top: `${top}px`, left: `${triggerRect.right - menuRect.width}px` });
}, [triggerEl]);
```
When the menu would overflow the bottom of the viewport, it flips to appear above the trigger. When flipped, the item list reverses order (`flex-col-reverse`) so the visual reading order is preserved.

**TradingView external links:**
```typescript
const getTvSymbol = () => {
    if (stock.exchange === 'INDEX') {
        if (stock.symbol === 'NIFTY 50') return 'NSE-NIFTY';
        if (stock.symbol === 'NIFTY BANK') return 'NSE-BANKNIFTY';
        return `NSE-${stock.symbol.replace(/ /g, '')}`;
    }
    return `${stock.exchange}-${stock.symbol}`;
};

window.open(`https://www.tradingview.com/chart/?symbol=${...}`, '_blank');
window.open(`https://in.tradingview.com/symbols/${getTvSymbol()}/financials-overview/`, '_blank');
```

**Pin action:**
```typescript
handlePin = (slot: number) => {
    onPin(stock.symbol, slot); // Slot 1 or 2 → pinned to header ticker
    onClose();
};
```

**`menuItems` configuration array:**
```typescript
const menuItems = [
    { type: 'pin', label: 'Pin', icon: 'fas fa-paperclip' },
    { type: 'notes', label: 'Notes', icon: 'fas fa-sticky-note' },
    { type: 'action', label: 'Chart', icon: '...', popout: true },
    { type: 'action', label: 'Option chain', icon: '...', popout: true },
    { type: 'gtt', label: 'Create GTT / GTC', icon: '...' },
    { type: 'alert', label: 'Create alert / ATO', icon: '...' },
    { type: 'marketDepthModal', label: 'Market depth', icon: '...' },
    { type: 'action', label: 'Add to basket', icon: '...' },
    { type: 'action', label: 'Fundamentals', icon: '...', popout: true },
    { type: 'action', label: 'Technicals', icon: '...', popout: true },
];
```

### Issues Identified
1. "Add to basket" and "Option chain" are `type: 'action'` stubs that call `alert()`.
2. The menu closes on `mouseLeave` — this means it disappears if the user moves the mouse off-menu. A more robust UX would close on click-outside (like `MarketDepthModal` and `OptionChainPanel` do).

---

## components/trade/TradeModals.tsx

### File Overview
* **File Name**: TradeModals.tsx  
* **File Path**: `/components/trade/TradeModals.tsx`  
* **Module**: GTT & Alert Modals  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
Contains two named exports: `AlertCreateModal` and `GTTCreateModal`. Each is a full-page portal modal form for creating the corresponding risk management instrument.

### Dependencies
* **Internal**: `contexts/PortfolioContext` (createAlert, createGTT), `types.ts` (Stock, TransactionType, GTTTriggerType, AlertProperty, AlertOperator, AlertType), `utils/formatters`

---

### AlertCreateModal

**Purpose:** Creates a price alert rule with a natural-language condition builder: "If [property] of [symbol] is [operator] than [value]".

**Core Components:**

Condition builder:
```typescript
// "If LTP of TATASTEEL (NSE) is >= than 150.00"
<select value={property} onChange={...}> {/* LTP, High, Low, Open, Close, Change, Change%, Volume */} </select>
<input readOnly value={`${stock.symbol} (${stock.exchange})`} />
<select value={operator}> {/* >=, <=, =, >, < */} </select>
<input type="number" value={value} step="0.05" />
```

Percentage helper:
```typescript
// Secondary input showing value as % of LTP
const getValuePercent = () => ((value - ltp) / ltp * 100).toFixed(2);
const handlePercentChange = (val) => setValue(ltp * (1 + parseFloat(val) / 100));
```

Alert type radio:
- `ALERT_ONLY`: notification only (implemented)
- `ATO (Alert Triggers Order)`: shows "coming soon" placeholder when selected

**On submit:**
```typescript
createAlert({ symbol, property, operator, value, type: alertType });
onClose();
```

---

### GTTCreateModal

**Purpose:** Creates a Good Till Triggered order — either a SINGLE trigger (one price condition) or OCO (One Cancels Other, with stoploss + target triggers).

**Core Components:**

Transaction/trigger type selectors (radio buttons):
```typescript
// OCO forces TransactionType.SELL (OCO is exit-only in this implementation)
useEffect(() => {
    if (triggerType === GTTTriggerType.OCO) setTransactionType(TransactionType.SELL);
}, [triggerType]);
```

SINGLE trigger form:
```typescript
// triggerPrice → qty → limitPrice
// Percentage inputs show value relative to current LTP
```

OCO form (two sections: Stoploss + Target):
```typescript
// Stoploss: triggerPrice (default: LTP * 0.95) → qty → limit (= trigger, simplified)
// Target: triggerPrice (default: LTP * 1.05) → qty → limit (= trigger, simplified)
```

Terms checkbox (required before submit):
```typescript
<label>
    I agree to the terms... This trigger expires on {/* LTP + 1 year */}
</label>
```

Expiry calculation:
```typescript
new Date(Date.now() + 31536000000).toLocaleDateString('en-CA')
// 31536000000 ms = 1 year
```

**On submit:**
```typescript
createGTT({ symbol, transactionType, triggerType, quantity, triggerPrice, limitPrice });
onClose();
```

### Issues Identified
1. OCO `stoplossLimitPrice` and `targetLimitPrice` are set to the same value as their trigger prices — in real trading, a limit price offset from the trigger provides slippage protection.
2. ATO (Alert Triggers Order) feature is a "coming soon" stub.
3. `window.alert()` used to show the terms agreement error.

---

## components/trade/watchlist/StockRow.tsx

### File Overview
* **File Name**: StockRow.tsx  
* **File Path**: `/components/trade/watchlist/StockRow.tsx`  
* **Module**: Stock Row  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
Single stock row within the watchlist panel. Displays the instrument symbol, exchange badge, live LTP, price change, and conditionally: a drag handle, hover action buttons (B/S/Depth/Chart/Delete/More), a holdings qty badge, and a note indicator.

### Business Function
The atomic unit of the watchlist view. Every interaction a trader performs from the watchlist — viewing price, buying, selling, charting, depth analysis — starts here.

### Inputs
```typescript
interface StockRowProps {
    stock: Stock;
    settings: WatchlistSettings;
    isDiscover: boolean;       // Hides all action buttons for discover lists
    isPredefined?: boolean;    // Hides drag handle and delete button for predefined lists
    hasNote: boolean;
    holdingQty?: number;
    onSelect: () => void;       // Navigate to chart
    onOrder: (type: TransactionType) => void;
    onRemove: () => void;
    onDragStart/onDragEnter/onDragEnd: drag events
    onMouseEnter/onMouseLeave: hover tracking
    isExpanded: boolean;        // True when depth panel is open below this row
    onDepthClick: () => void;
    onMoreClick: (symbol, event) => void;
}
```

### Core Components

**Change calculation based on settings:**
```typescript
const referencePrice = settings.changeType === 'open' ? stock.open : stock.prevClose;
const change = stock.ltp - referencePrice;
const changePercent = referencePrice > 0 ? (change / referencePrice) * 100 : 0;
```

**Hover action panel:**
```tsx
<div className="absolute right-3 ... opacity-0 group-hover/row:opacity-100 ...">
    <Tooltip title="Buy" shortcut="B">
        <button className="w-8 h-8 rounded bg-success text-white font-bold">B</button>
    </Tooltip>
    <Tooltip title="Sell" shortcut="S">
        <button className="w-8 h-8 rounded bg-danger text-white font-bold">S</button>
    </Tooltip>
    <Tooltip title="Market Depth" shortcut="D">
        <button className={isExpanded ? 'bg-primary/20 text-primary' : 'bg-overlay'}>
            <i className="fas fa-bars"/>
        </button>
    </Tooltip>
    <Tooltip title="Chart" shortcut="C"><button/></Tooltip>
    {!isPredefined && <Tooltip title="Delete"><button/></Tooltip>}
    <Tooltip title="More"><button onMouseDown={onMoreClick}/></Tooltip>
</div>
```
Note: `onMouseDown` (not `onClick`) is used for "More" to avoid conflicts with the drag event sequence.

**Drag handle:**
```tsx
{isDraggable && <span className="text-muted cursor-grab pr-2"><i className="fas fa-grip-vertical"/></span>}
// isDraggable = !isDiscover && !isPredefined
```

**Settings-controlled display:**
```typescript
{settings.showOptions.priceChange && <span>{change.toFixed(2)}</span>}
{settings.showOptions.priceChangePercent && <span>{formatPercent(changePercent / 100)}</span>}
{settings.showOptions.priceDirection && <i className={`fas fa-caret-${change >= 0 ? 'up' : 'down'}`}/>}
{settings.showOptions.holdings && holdingQty && <p>Qty: {holdingQty}</p>}
{settings.showOptions.notes && hasNote && <i className="fas fa-sticky-note text-yellow-400"/>}
```

### Architecture Alignment
Correctly pure — no context consumption, receives all data via props. All state mutations are delegated up via callbacks.

---

## components/trade/watchlist/MarketDepthPanel.tsx

### File Overview
* **File Name**: MarketDepthPanel.tsx  
* **File Path**: `/components/trade/watchlist/MarketDepthPanel.tsx`  
* **Module**: Inline Market Depth  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
Inline market depth panel that appears below a stock row when the user clicks the depth icon. Shows 5 or 20 levels of bid/ask data, a price range indicator, and key OHLCV stats. Clicking any price level or stat pre-fills that price in the order window.

### Business Function
Quick order placement from depth data. Traders can click on a bid level to see the best price to sell, or an ask level to see the best price to buy, and immediately open a pre-filled order window.

### Inputs
```typescript
{
    stock: Stock;
    onPriceClick: (price: number, type: TransactionType) => void;
}
```

### Core Components

**`PriceRangeIndicator`** with clickable markers:
```typescript
// Low/High labels and LTP/Open dot markers are all clickable
onPriceClick={(price) => onPriceClick(price, TransactionType.BUY)}
```

**`DepthRow`** with proportional bars:
```typescript
const percentage = (level.quantity / maxQty) * 100;
// Bid bars fill from right (bg-success/20), ask bars fill from left (bg-danger/20)
// Clicking bid → SELL at that price; clicking ask → BUY at that price
```

**Clickable stat labels:**
```typescript
// Open, Prev Close, High, Low, Lower Circuit → onPriceClick BUY
// Upper Circuit → onPriceClick SELL
```

### Relationship to MarketDepthModal
`MarketDepthPanel` is the inline/compact version embedded within the watchlist. `MarketDepthModal` is the full-page popup with additional search and OHLCV display. Both duplicate the `DepthRow` rendering logic — a shared `DepthTable` component would reduce duplication.

---

## components/trade/watchlist/NotesEditor.tsx

### File Overview
* **File Name**: NotesEditor.tsx  
* **File Path**: `/components/trade/watchlist/NotesEditor.tsx`  
* **Module**: Stock Notes Editor  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
Auto-sizing textarea for attaching free-text notes to individual stocks within a watchlist. Supports `Ctrl+Enter` to save and `Esc` to close. Notes are persisted in `WatchlistContext`.

### Dependencies
* **Internal**: `contexts/WatchlistContext` (updateNote, deleteNote), `components/common/Tooltip`

### Core Components

**Auto-resize:**
```typescript
useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
}, [note]);
```
Collapses to the minimum height when empty, expands to fit content.

**Keyboard shortcuts:**
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.ctrlKey && e.key === 'Enter') handleSave();
};
```

**Save logic:**
```typescript
const handleSave = () => {
    if (note.trim()) updateNote(watchlistId, stockSymbol, note);
    else deleteNote(watchlistId, stockSymbol); // Empty note removes the record
    onClose();
};
```

### Issues Identified
The `handleSave` function is referenced inside a `useEffect` dependency array but is not wrapped in `useCallback` — this causes the event listener to be re-registered on every render.

---

## components/trade/watchlist/WatchlistSettingsPanel.tsx

### File Overview
* **File Name**: WatchlistSettingsPanel.tsx  
* **File Path**: `/components/trade/watchlist/WatchlistSettingsPanel.tsx`  
* **Module**: Watchlist Display Settings  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
A collapsible settings panel within the watchlist. Controls: change reference (close vs open price), visible columns (6 toggles), and sort order (4 options: %, LTP, A-Z, EXCH).

### Dependencies
* **Internal**: `types.ts` (WatchlistSettings, SortByType), `components/common/Tooltip`

### Core Components

**Change type radio:**
```typescript
// Determines the reference price used in StockRow for change calculation
<input type="radio" value="close" checked={changeType === 'close'} />
<input type="radio" value="open" checked={changeType === 'open'} />
```

**Show options checkboxes (6):**
`priceChange`, `priceChangePercent`, `priceDirection`, `holdings`, `notes`, `groupColors`

**Sort buttons:**
```typescript
(['%', 'LTP', 'A-Z', 'EXCH'] as const).map(option => (
    <button onClick={() => handleSort(option)} 
            className={sortBy === option ? 'bg-primary border-primary text-white' : 'bg-surface'}>
        {option}
    </button>
))
```
`handleSort` calls both `onSettingsChange({ sortBy })` (persists selection) and `onSort(sortBy)` (triggers immediate sort).
