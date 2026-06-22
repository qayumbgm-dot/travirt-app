# UI Components — Trade Panels

---

## components/trade/WatchlistPanel.tsx

### File Overview
* **File Name**: WatchlistPanel.tsx  
* **File Path**: `/components/trade/WatchlistPanel.tsx`  
* **Module**: Watchlist Panel  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
The main left panel of the trade screen. Renders the user's active watchlist (grouped stocks with live prices) or a predefined instrument list (Nifty 50 constituents, F&O stocks, etc.). The most feature-rich component in the codebase at 645 lines.

### Business Function
Primary stock browser and monitor. Traders organise their universe of instruments here, monitor live prices, access market depth, place quick orders, and navigate to charts.

### System Role
Consumer of both `WatchlistContext` and `PortfolioContext`. Acts as the hub between watchlist organisation, live pricing, and order initiation.

### Dependencies
* **Internal**:
  - `contexts/WatchlistContext` (all watchlist operations)
  - `contexts/PortfolioContext` (live market data, holdings)
  - `utils/formatters` (formatCurrency, getInstrumentKey, parseInstrumentKey)
  - `components/trade/watchlist/StockRow`
  - `components/trade/watchlist/MarketDepthPanel`
  - `components/trade/watchlist/NotesEditor`
  - `components/trade/watchlist/WatchlistSettingsPanel`
  - `components/trade/MoreOptionsMenu`
  - `constants.ts` (DISCOVER_LISTS, CONSTITUENTS_MAP, MOCK_STOCKS)
  - `types.ts`

### Inputs
```typescript
interface WatchlistPanelProps {
    mode: 'watchlist' | 'predefined' | 'optionChain';
    onStockSelect: (stock: Stock) => void;
    onOrderAction: (action: OrderAction) => void;
    onCreateGTT: (stock: Stock) => void;
    onCreateAlert: (stock: Stock) => void;
    onShowDepth: (stock: Stock) => void;
    onShowMarketDepthModal: (stock: Stock) => void;
    onAddToWatchlist: (stock: Stock) => void;
}
```

### Outputs
Left panel content with:
- Search bar (live symbol/name search)
- Group headers (with colour indicator, collapse/expand, reorder controls)
- Stock rows (via `StockRow`)
- Inline market depth (via `MarketDepthPanel`)
- Notes editor (via `NotesEditor`)
- Settings panel (via `WatchlistSettingsPanel`)
- Context menu (via `MoreOptionsMenu`)

### Core Components

**`StandardWatchlistWrapper`** — main watchlist view:
- Search with live results from `PortfolioContext.marketData`
- Group header rendering with drag handles and action buttons
- Stock-to-group assignment
- Drag-and-drop for stock reordering (HTML5 native `draggable`)
- Drag-and-drop for group reordering (separate drag state)
- Settings panel toggle

**`PredefinedListPanel`** — static index/F&O constituent lists:
```typescript
const constituents = CONSTITUENTS_MAP[activeList] || [];
const stocks = constituents.map(symbol => 
    marketData.find(s => s.symbol === symbol)
).filter(Boolean);
```
Renders `StockRow` with `isPredefined={true}` to hide remove/drag controls.

**`DiscoverListPanel`** — screener results:
Filters `MOCK_STOCKS` based on `DiscoverList` type (52-week high, volume shockers, etc.)

**Holdings badge:**
```typescript
const holdingsMap = useMemo(() => {
    const map: Record<string, number> = {};
    portfolio.positions.forEach(p => { map[`${p.exchange}:${p.symbol}`] = p.quantity; });
    return map;
}, [portfolio.positions]);
```
Passes `holdingQty={holdingsMap[instrumentKey]}` to `StockRow`.

**Composite key handling:**
```typescript
// Storage: "NSE:TATASTEEL"
addStockToWatchlist(getInstrumentKey(stock));

// Retrieval:
watchlist.stocks.map(key => {
    const { symbol, exchange } = parseInstrumentKey(key);
    const stock = getStock(symbol, exchange);
    return stock ? <StockRow stock={stock} .../> : null;
});
```

**Drag-and-drop (stock reorder):**
```typescript
const handleDragStart = (e: React.DragEvent, key: string) => {
    dragItem.current = key;
    e.dataTransfer.effectAllowed = 'move';
};
const handleDragEnter = (e: React.DragEvent, key: string) => {
    dragOverItem.current = key;
};
const handleDragEnd = () => {
    // Build new order array by swapping dragItem and dragOverItem positions
    const newOrder = [...currentStocks];
    const fromIdx = newOrder.indexOf(dragItem.current!);
    const toIdx = newOrder.indexOf(dragOverItem.current!);
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragItem.current!);
    reorderStocks(watchlistId, newOrder);
};
```

**Expanded depth state:**
```typescript
const [expandedDepthSymbol, setExpandedDepthSymbol] = useState<string | null>(null);
// Toggled by StockRow's depth button; renders MarketDepthPanel below the row
```

### Workflow Integration
1. User clicks B/S on `StockRow` → calls `onOrderAction({ stock, type })`
2. `App.tsx.handleOrderAction` sets `orderWindowState` → `OrderWindow` opens
3. User clicks depth icon → `setExpandedDepthSymbol(stock.symbol)` → `MarketDepthPanel` renders
4. User clicks `•••` → `setActiveMoreMenu({ stock, x, y })` → `MoreOptionsMenu` portal renders
5. User drags stock → `reorderStocks()` updates `WatchlistContext`

### Architecture Alignment
Correctly separates concerns: layout and orchestration in `WatchlistPanel`, atomic row rendering in `StockRow`, depth data in `MarketDepthPanel`, notes in `NotesEditor`, settings in `WatchlistSettingsPanel`. The `MoreOptionsMenu` is a portal, correctly escaping the panel's overflow context.

### Issues Identified
1. At 645 lines, `WatchlistPanel.tsx` is a candidate for further decomposition. The search, group management, and stock list sections could each be separate components.
2. The `DiscoverListPanel` renders static filtered data rather than connecting to a real screener API.
3. The `mode` prop switches between three completely different sub-components but is passed from `App.tsx` — this makes the component's public API broader than necessary.

### Refactoring Recommendations
Extract `SearchPanel`, `GroupHeader`, `WatchlistStockList` as separate sub-components within a `watchlist/` directory to reduce the size of the parent file.

---

## components/trade/WatchlistTabs.tsx

### File Overview
* **File Name**: WatchlistTabs.tsx  
* **File Path**: `/components/trade/WatchlistTabs.tsx`  
* **Module**: Watchlist Tab Bar  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
Horizontal tab bar above the watchlist panel. Shows tabs for watchlists 1–7 plus an overflow "stack" icon. Supports keyboard shortcuts `Ctrl+Shift+1-7` to switch watchlists and `Ctrl+Shift+K` to open the Manage Watchlists modal.

### Business Function
Fast watchlist navigation. Keyboard shortcuts allow power users to switch between instrument lists without lifting their hands from the keyboard.

### Dependencies
* **Internal**: `contexts/WatchlistContext`, `components/trade/ManageWatchlistsModal`

### Core Components

**Keyboard shortcut handler:**
```typescript
useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey) {
            const num = parseInt(e.key);
            if (num >= 1 && num <= 7) {
                e.preventDefault();
                setActiveView({ type: 'watchlist', id: num });
            }
            if (e.key === 'K') {
                e.preventDefault();
                setShowManageModal(true);
            }
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

**Local `Tooltip` copy:**
Contains a simplified inline `Tooltip` component (no edge detection, no ARIA ID). This is a code duplication issue.

**Tab rendering:**
```tsx
{watchlists.slice(0, 7).map(wl => (
    <button 
        key={wl.id}
        onClick={() => setActiveView({ type: 'watchlist', id: wl.id })}
        className={`... ${activeView.type === 'watchlist' && activeView.id === wl.id ? 'border-b-2 border-primary text-primary' : 'text-muted'}`}
    >
        {wl.id}
    </button>
))}
```

### Issues Identified
1. Local `Tooltip` duplicate (no edge detection) — replace with `components/common/Tooltip`.
2. Tab labels show only the watchlist ID number, not the watchlist name — name is only visible on hover via tooltip. Users with many watchlists cannot identify them at a glance.

### Refactoring Recommendations
1. Replace local `Tooltip` with shared import.
2. Show truncated watchlist name in tab instead of/in addition to number.

---

## components/trade/OrderWindow.tsx

### File Overview
* **File Name**: OrderWindow.tsx  
* **File Path**: `/components/trade/OrderWindow.tsx`  
* **Module**: Order Entry  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
Draggable floating order entry panel. Provides five order variety tabs (Quick/Regular/MTF/Iceberg/Cover), a full order form with all regulatory parameters, and an optional slide-in market depth side panel. The primary mechanism for placing virtual trades.

### Business Function
Order ticket — the most critical interaction in the platform. Must accurately represent Indian order types, validity options, and brokerage fee preview.

### System Role
Instantiated by `App.tsx` when `orderWindowState` is set. Renders at `position: fixed` over all content. Reads from and writes to `PortfolioContext`.

### Dependencies
* **Internal**: `contexts/PortfolioContext` (executeTrade, portfolio for balance), `types.ts`, `utils/formatters`
* **External**: `localStorage` (tab preference persistence)

### Inputs
```typescript
interface OrderWindowProps {
    stock: Stock;
    initialType: TransactionType;
    initialPrice?: number;
    initialOrderType?: OrderType;
    onClose: () => void;
    onShowMarketDepthPanel: (stock: Stock) => void;
}
```

### Core Components

**Draggable positioning:**
```typescript
const dragRef = useRef<{ startX, startY, initialX, initialY } | null>(null);

const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: position.x, initialY: position.y };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
};
```
Uses `position: fixed` with `{ left: position.x, top: position.y }` inline style. Drag listeners attached to `window` to handle fast mouse movement.

**localStorage persistence (7-day TTL):**
```typescript
const STORAGE_KEY = 'travirt_order_settings';
const STORAGE_TTL = 7 * 24 * 60 * 60 * 1000;

// On mount:
const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
    const { value, timestamp } = JSON.parse(saved);
    if (Date.now() - timestamp < STORAGE_TTL) {
        setActiveTab(value.activeTab);
    }
}
```

**Order variety tabs:**
- **Quick**: Market order, single-field (qty only)
- **Regular**: Full form — qty, price, validity, disclosed qty, trigger price (for SL)
- **MTF**: Margin Trading Facility — requires checkbox agreement before form enables
- **Iceberg**: Chunk-based order — total qty + lot size
- **Cover**: Cover order — price + stoploss trigger

**BUY/SELL theme:**
```typescript
const isBuy = transactionType === TransactionType.BUY;
const themeClass = isBuy ? 'bg-success' : 'bg-danger';
const borderClass = isBuy ? 'border-success/30' : 'border-danger/30';
```
Applied to header background, window border, and submit button.

**Margin/balance display:**
```typescript
const estimatedCost = quantity * price;
const availableBalance = portfolio.virtualBalance;
const marginRequired = estimatedCost; // Simplified — no margin calculation
```

**Market depth side panel:**
320px wide panel that slides in from the left or right based on window position relative to viewport center:
```typescript
const depthSide = position.x > window.innerWidth / 2 ? 'left' : 'right';
```

**`handleSubmit()`:**
```typescript
const success = executeTrade({
    symbol: stock.symbol,
    exchange: stock.exchange,
    transactionType,
    orderType,
    variety: activeTab as OrderVariety,
    quantity,
    price: orderType === OrderType.MARKET ? stock.ltp : limitPrice,
    validity,
});
if (success) onClose();
else alert('Insufficient balance or invalid quantity');
```

### Key Code Highlights
**MTF Agreement Gate:**
```typescript
{activeTab === 'MTF' && !mtfAgreed && (
    <div className="absolute inset-0 bg-base/90 flex items-center justify-center z-10">
        <div className="text-center">
            <p>MTF requires you to accept additional risk terms.</p>
            <button onClick={() => setMtfAgreed(true)}>I Agree</button>
        </div>
    </div>
)}
```

### Issues Identified
1. `alert()` is used when trade execution fails — should be a styled inline error message.
2. Margin calculation is simplified (`estimatedCost = qty * price`) — no actual leverage or SPAN/EXPOSURE margin model.
3. The window does not constrain to viewport bounds — users can drag it completely off-screen.

### Refactoring Recommendations
1. Replace `alert()` with an inline error banner inside the form.
2. Add viewport boundary clamping in the drag `mousemove` handler.
3. Implement a real brokerage estimate in the order form preview (reuse `BrokerageCalculatorScreen` logic).

---

## components/trade/ChartPanel.tsx

### File Overview
* **File Name**: ChartPanel.tsx  
* **File Path**: `/components/trade/ChartPanel.tsx`  
* **Module**: Price Chart  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
Renders an interactive candlestick price chart with volume histogram overlay using the TradingView `lightweight-charts` v4 library. Generates 200 mock historical candles and simulates 1-second real-time ticks.

### Business Function
Technical analysis workspace. Traders use this to study price patterns, identify support/resistance levels, and time entries.

### System Role
Rendered by `TradeScreen` (inline) and by `ChartWindow` (in a floating popup). The `key` prop is always changed when the stock changes to force a full remount.

### Dependencies
* **Internal**: `types.ts` (Stock)
* **External**: `lightweight-charts` ^4.1.0

### Core Components

**Three `useEffect` lifecycle:**
```typescript
// Effect 1: Chart initialization + ResizeObserver
useEffect(() => {
    const chart = createChart(containerRef.current!, {
        layout: { background: { color: '#0B1B3F' }, textColor: '#93C5FD' },
        grid: { vertLines: { color: '#1E3A8A' }, horzLines: { color: '#1E3A8A' } },
        crosshair: { mode: CrosshairMode.Normal },
    });
    
    const candleSeries = (chart as any).addCandlestickSeries({
        upColor: '#10B981', downColor: '#EF4444',
        borderVisible: false,
        wickUpColor: '#10B981', wickDownColor: '#EF4444',
    });
    
    const volumeSeries = (chart as any).addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
        scaleMargins: { top: 0.8, bottom: 0 },
    });
    
    const resizeObserver = new ResizeObserver(() => {
        chart.applyOptions({ width: container.clientWidth });
    });
    resizeObserver.observe(containerRef.current!);
    
    return () => { resizeObserver.disconnect(); chart.remove(); };
}, []);

// Effect 2: Historical data load on stock change
useEffect(() => {
    const history = generateHistoricalData(stock.ltp);
    candleSeriesRef.current?.setData(history.candles);
    volumeSeriesRef.current?.setData(history.volumes);
}, [stock.symbol]);

// Effect 3: Real-time tick simulation
useEffect(() => {
    const interval = setInterval(() => {
        const lastCandle = lastCandleRef.current;
        const newClose = lastCandle.close * (1 + (Math.random() - 0.5) * 0.002);
        const updatedCandle = { 
            time: lastCandle.time, 
            open: lastCandle.open, 
            high: Math.max(lastCandle.high, newClose),
            low: Math.min(lastCandle.low, newClose),
            close: newClose 
        };
        candleSeriesRef.current?.update(updatedCandle);
    }, 1000);
    return () => clearInterval(interval);
}, []);
```

**`generateHistoricalData(startPrice):`**
```typescript
// Generates 200 1-minute OHLCV candles ending at current time
const candles = [];
let price = startPrice * 0.85; // Start below current price
for (let i = 200; i >= 0; i--) {
    const open = price;
    const change = (Math.random() - 0.5) * 0.004 * price;
    const close = Math.max(0.05, price + change);
    const high = Math.max(open, close) + Math.random() * 0.002 * price;
    const low = Math.min(open, close) - Math.random() * 0.002 * price;
    const volume = Math.floor(Math.random() * 100000) + 10000;
    candles.push({ time: (Date.now() / 1000 - i * 60) as UTCTimestamp, open, high, low, close, volume });
    price = close;
}
```

**TypeScript workaround:**
```typescript
(chart as any).addCandlestickSeries(...)
(chart as any).addHistogramSeries(...)
```
lightweight-charts v4 has strict TypeScript generics that require this cast. The v4 API methods exist at runtime but TypeScript cannot infer the return type without the cast.

**Timeframe toolbar:**
```typescript
const timeframes = ['1m', '5m', '15m', '1h', '1D'];
// Rendered but not wired — clicking a timeframe does not change the candle aggregation
```

### Issues Identified
1. Timeframe toolbar buttons render but have no handler — clicking them does nothing.
2. Candle aggregation is always 1-minute — changing to 5m/1h would require re-aggregating the 1m data.
3. Chart colours are hardcoded values rather than CSS custom property references — they do not update if the Tailwind theme changes.
4. `(chart as any)` type casts should be resolved with proper type declarations or a type assertion utility.

### Refactoring Recommendations
1. Implement timeframe selection by aggregating `generateHistoricalData()` output into OHLCV buckets of the selected resolution.
2. Wire the timeframe buttons to `chartPanelKey` changes in `TradeScreen`/`ChartWindow`.

---

## components/trade/ChartWindow.tsx

### File Overview
* **File Name**: ChartWindow.tsx  
* **File Path**: `/components/trade/ChartWindow.tsx`  
* **Module**: Floating Chart Window  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
A floating, draggable, and resizable popup window that hosts either `ChartPanel` or `OptionChainPanel`. Allows traders to view a chart while browsing the watchlist simultaneously.

### Business Function
Multi-tasking interface — keeps chart analysis visible while scrolling watchlists or managing orders.

### Core Components

**Both drag and resize use the same pattern** (mouse event listeners on `window`):
```typescript
// Drag (min size: none)
const dragRef = useRef<{ startX, startY, initialX, initialY } | null>(null);

// Resize (min: 400×300)
const resizeRef = useRef<{ startX, startY, initialWidth, initialHeight } | null>(null);

const handleResizeMouseDown = (e: React.MouseEvent) => {
    resizeRef.current = { startX: e.clientX, startY: e.clientY, ... };
    const handleMouseMove = (moveEvent: MouseEvent) => {
        setSize({
            width: Math.max(400, resizeRef.current.initialWidth + dx),
            height: Math.max(300, resizeRef.current.initialHeight + dy)
        });
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
};
```

**Resize handle:** SVG corner grip (southeast-only resize).

**Initial centering:**
```typescript
useEffect(() => {
    setPosition({
        x: (window.innerWidth - size.width) / 2,
        y: (window.innerHeight - size.height) / 2
    });
}, []);
```

**`showOptionChainTab`** — currently `true` for ALL NSE/BSE stocks (broad condition):
```typescript
const showOptionChainTab = stock.exchange === 'NSE' || stock.exchange === 'BSE' || ...;
```

**Simulated actions in OptionChainPanel callbacks:**
```typescript
onChartSelect={(s) => alert(`Chart selected: ${s.symbol}`)}
onCreateGTT={(s) => alert(`Create GTT for ${s}`)}
```
These should wire to proper handlers from `App.tsx` props.

### Issues Identified
1. OptionChainPanel callbacks use `alert()` stubs — should propagate to real handlers via props.
2. No viewport boundary enforcement during drag — window can be dragged off-screen.
3. No "snap to edges" or "maximize" functionality.

---

## components/trade/IndicesPanel.tsx

### File Overview
* **File Name**: IndicesPanel.tsx  
* **File Path**: `/components/trade/IndicesPanel.tsx`  
* **Module**: Indices Reference  
* **Layer**: Presentation / Component  
* **Status**: Active (static data)

### Purpose
Full-page table display of Indian (17 indices) and Global (15 indices) market data. Accessible from the header navigation "Indices" link.

### Dependencies
* **Internal**: `constants.ts` (INDIAN_INDICES_DATA, GLOBAL_INDICES_DATA), `utils/formatters`

### Core Components
Two tabs: "Indian Indices" / "Global Indices". Each renders a styled table:

**Indian:** Name | Exchange | Last Traded | Day Change | High | Low | Open

**Global:** Name | Location | Last Traded | Day Change | Prev Close | Date

Both tables use:
- Green/red colouring on change values based on `index.change >= 0`
- `hover:bg-overlay/30` row hover
- `last:border-b-0` to clean up final row border

### Issues Identified
* All data is static from `constants.ts` — indices do not update during the session.
* There is a commented-out country flag placeholder in the Global table that was never implemented.

### Refactoring Recommendations
Connect to `useIndexData` hook or create a new `useGlobalIndexData` hook to make the data live-updating.
