# Screen Components

---

## screens/DashboardScreen.tsx

### File Overview
* **File Name**: DashboardScreen.tsx  
* **File Path**: `/screens/DashboardScreen.tsx`  
* **Module**: Dashboard  
* **Layer**: Presentation / Screen  
* **Status**: Active

### Purpose
The primary landing screen after login. Provides a high-level financial overview: portfolio value, today's P&L, NXO token balance, virtual cash balance, index sparklines, open holdings summary, and top market movers.

### Business Function
Gives traders an instant snapshot of their position health and market pulse without navigating to individual screens.

### Dependencies
* **Internal**: `contexts/PortfolioContext`, `constants.ts` (MOCK_INDICES), `utils/formatters`, `App.tsx` (Screen type)
* **External**: `recharts` (AreaChart, Area, ResponsiveContainer)

### Inputs
* `setActiveScreen: (screen: Screen) => void` — navigation callback from `App.tsx`
* `portfolio` — from `usePortfolio()` hook
* `marketData: Stock[]` — from `usePortfolio()` hook
* `loading: boolean` — from `usePortfolio()` hook

### Outputs
A main content area with four stat cards, three index sparkline cards, a holdings table (top 5 positions), and a top-5 movers panel.

### Core Components

**`StatCard`** — reusable metric display:
```typescript
// Props: title, value, change?, changeColor?, icon, iconBg
<div className="bg-surface rounded-lg p-5 flex items-center">
    <div className={`rounded-full p-3 ${iconBg}`}><i className={`fas ${icon}`}/></div>
    <div>
        <p className="text-muted">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {change && <p className={changeColor}>{change}</p>}
    </div>
</div>
```

**`IndexCard`** — index display with Recharts sparkline:
```typescript
const IndexCard: React.FC<{ asset: typeof MOCK_INDICES[0] }> = ({ asset }) => (
    <div className="bg-surface rounded-lg p-4 flex items-center justify-between">
        {/* Symbol + Price + Change */}
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={asset.history}>
                <linearGradient id={`color${asset.symbol}`} .../>
                <Area type="monotone" dataKey="value" stroke={...} fill={...}/>
            </AreaChart>
        </ResponsiveContainer>
    </div>
);
```
Uses dynamic SVG gradient IDs based on symbol name — gradient IDs are unique because symbols differ.

**Top Movers calculation:**
```typescript
const topMovers = [...marketData]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 5);
```
Sorts by absolute percentage change, showing both the biggest gainers and losers.

**Portfolio value calculation:**
```typescript
const portfolioValue = portfolio.virtualBalance + portfolio.totalCurrentValue;
```
Combines free cash with position market value.

### Key Code Highlights
React key fix (applied in prior session):
```typescript
// CORRECT — composite key prevents duplicate key warning when NSE and BSE
// both list TATASTEEL in top movers
<li key={`${stock.exchange}:${stock.symbol}`}>
```

### Issues Identified
* Holdings table uses `key={pos.symbol}` without exchange prefix — theoretically could duplicate if same symbol held on both NSE and BSE simultaneously.
* `MOCK_INDICES` sparkline history data is static — the sparklines never update during the session.

### Refactoring Recommendations
1. Fix holdings table key: `key={`${pos.exchange}:${pos.symbol}`}`.
2. Connect index sparklines to live data from `PortfolioContext.marketData`.

---

## screens/TradeScreen.tsx

### File Overview
* **File Name**: TradeScreen.tsx  
* **File Path**: `/screens/TradeScreen.tsx`  
* **Module**: Trade View  
* **Layer**: Presentation / Screen  
* **Status**: Active

### Purpose
The main trading screen. Routes between `ChartPanel` (candlestick chart) and `OptionChainPanel` based on the `viewMode` prop. Receives the selected stock from `App.tsx` state.

### Business Function
The primary workspace for a trader analysing a specific instrument. Allows switching between technical chart analysis and options data in one unified view.

### Dependencies
* **Internal**: `components/trade/ChartPanel`, `components/trade/OptionChainPanel`, `types.ts`

### Inputs
```typescript
interface TradeScreenProps {
    selectedStock: Stock | null;
    viewMode: TradeViewMode;            // 'chart' | 'optionChain'
    setViewMode: (mode: TradeViewMode) => void;
    onOrderAction: (action: OrderAction) => void;
    onAddToWatchlist: (stock: Stock) => void;
    onShowDepth: (symbol: string) => void;
    onCreateGTT: (symbol: string) => void;
    onCreateAlert: (symbol: string) => void;
}
```

### Core Components
```typescript
const [chartPanelKey, setChartPanelKey] = useState(0);

useEffect(() => {
    setChartPanelKey(Date.now());
}, [selectedStock?.symbol]);
```
The `chartPanelKey` forces a full unmount/remount of `ChartPanel` when the stock changes, which is necessary because lightweight-charts does not support dynamic data replacement without reinitialisation.

Option chain tab visibility:
```typescript
const showOptionChainTab = stock.exchange === 'NSE' || stock.exchange === 'BSE' || 
                            stock.instrumentType !== InstrumentType.EQUITY;
```

### Issues Identified
* The `viewMode` tab bar (Chart / Option Chain) is defined inside `TradeScreen` but the state is lifted to `App.tsx`. This creates a tight coupling between the screen and the parent.

---

## screens/LandingScreen.tsx

### File Overview
* **File Name**: LandingScreen.tsx  
* **File Path**: `/screens/LandingScreen.tsx`  
* **Module**: Marketing  
* **Layer**: Presentation / Screen  
* **Status**: Active (public, pre-auth)

### Purpose
The public marketing page shown to unauthenticated users. Contains hero section, platform stats, FAQ accordion, and footer. Links to sub-pages (Courses, Features, How It Works).

### Business Function
Converts visitors to registered users. The primary call-to-action buttons navigate to login/signup.

### Dependencies
* **Internal**: `App.tsx` (Screen type for navigation callbacks)

### Inputs
```typescript
{ 
    onLogin: () => void;
    onSignup: () => void;
    onNavigate: (page: 'courses' | 'features' | 'howItWorks') => void;
}
```

### Core Components
- Hero section with animated tagline and dual CTAs (Login / Get Started)
- Stats bar: "50,000+ Traders", "₹10Cr+ Volume Simulated", "99.9% Uptime"
- FAQ accordion: 6 questions with `useState` toggle for open/closed state
- Footer with navigation links and copyright

### Issues Identified
All statistics ("50,000+ Traders") are hardcoded marketing copy — not derived from any real data.

---

## screens/AINewsScreen.tsx

### File Overview
* **File Name**: AINewsScreen.tsx  
* **File Path**: `/screens/AINewsScreen.tsx`  
* **Module**: AI News  
* **Layer**: Presentation / Screen  
* **Status**: Active (gracefully degrades without API key)

### Purpose
Displays AI-generated market news summaries alongside individual headlines. Uses Google Gemini to synthesise multiple headlines into a brief, actionable paragraph.

### Dependencies
* **Internal**: `services/geminiService.ts`

### Core Components

**Hardcoded mock headlines (10 items):**
```typescript
const mockHeadlines = [
    "Sensex surges 400 points as IT stocks rally on strong Q2 results",
    "RBI keeps repo rate unchanged at 6.5% amid inflation concerns",
    // ...
];
```

**On-mount API call:**
```typescript
useEffect(() => {
    setLoading(true);
    summarizeNews(mockHeadlines).then(summary => {
        setSummary(summary);
        setLoading(false);
    });
}, []);
```

**Skeleton loading animation** — pulsing grey bars while Gemini responds.

### Intelligence Contribution
Only screen that directly uses AI. The Gemini summary card is rendered with a purple gradient border to visually distinguish AI content.

### Issues Identified
* No error handling on the `summarizeNews()` promise — an API error will leave the component in loading state indefinitely.
* Mock headlines are hardcoded strings — a real news feed integration is needed for production value.

---

## screens/PortfolioScreen.tsx

### File Overview
* **File Name**: PortfolioScreen.tsx  
* **File Path**: `/screens/PortfolioScreen.tsx`  
* **Module**: Holdings / Portfolio  
* **Layer**: Presentation / Screen  
* **Status**: Active

### Purpose
Detailed view of all current holdings. Shows invested value, current market value, total P&L, P&L percentage, and a full holdings table with live bid/ask prices.

### Dependencies
* **Internal**: `contexts/PortfolioContext`, `utils/formatters`

### Core Components

**Header summary row:**
- Invested: `portfolio.totalInvested`
- Current: `portfolio.totalCurrentValue`
- P&L: `portfolio.todayPnl` (absolute + percent)

**Holdings table** (all positions, not just top 5):
```
Symbol | Exchange | Qty | Avg Price | Bid | Ask | LTP | P&L | P&L%
```
Bid/ask are sourced from `getStock(pos.symbol, pos.exchange)?.bid` and `.ask`.

### Issues Identified
* Portfolio header shows `todayPnl` but labels it as overall P&L — this could be confusing as `todayPnl` is computed as current P&L from avg price, not intraday change.
* No sorting or filtering on the holdings table.

---

## screens/OrdersScreen.tsx

### File Overview
* **File Name**: OrdersScreen.tsx  
* **File Path**: `/screens/OrdersScreen.tsx`  
* **Module**: Orders Management  
* **Layer**: Presentation / Screen  
* **Status**: Active

### Purpose
Three-tab management screen for all order-related history: executed orders, pending GTT triggers, and configured price alerts.

### Dependencies
* **Internal**: `contexts/PortfolioContext`, `utils/formatters`

### Core Components

**Tab 1 — Orders** (order history):
Table: timestamp, symbol, type (BUY/SELL), variety, qty, price, status badge.

**Tab 2 — GTT Orders:**
Table: symbol, trigger type (SINGLE/OCO), status, trigger prices, expiry.
```typescript
// OCO renders two price rows
{order.triggerType === 'OCO' && (
    <>
        <p>SL: {formatCurrency(order.stoplossTriggerPrice)}</p>
        <p>Target: {formatCurrency(order.targetTriggerPrice)}</p>
    </>
)}
```
Delete with confirm dialog.

**Tab 3 — Alerts:**
Table: symbol, condition (e.g. "LTP >= 2400"), type (ALERT_ONLY / ATO), status, created date.

### Issues Identified
* GTT tab has a delete button with a `window.confirm()` dialog — not consistent with the portal-based modal pattern used elsewhere.
* Alert conditions are rendered as concatenated strings without type-safe formatting.

---

## screens/FundsScreen.tsx

### File Overview
* **File Name**: FundsScreen.tsx  
* **File Path**: `/screens/FundsScreen.tsx`  
* **Module**: Token Economy / Funds  
* **Layer**: Presentation / Screen  
* **Status**: Active

### Purpose
Manages the three-layer TraVirt token economy: add INR funds, convert INR to NXO tokens, convert NXO to virtual trading balance. Also shows transaction history and provides the daily bonus claim.

### Business Function
Incentive and onboarding mechanism. Forces users to understand the token economy before they can trade. The daily bonus (10 NXO) encourages return visits.

### Dependencies
* **Internal**: `contexts/PortfolioContext`, `utils/formatters`

### Core Components

**Step 1 — Add INR:**
```typescript
<input type="number" min="100" step="100" value={inrAmount} />
<button onClick={() => addInr(inrAmount)}>Add Funds</button>
```

**Step 2 — Buy NXO Tokens:**
```typescript
// 1 INR = 1 NXO (no spread)
<button onClick={() => buyNxo(nxoAmount)}>Buy NXO</button>
```

**Step 3 — Convert to Virtual Balance:**
```typescript
// 1 NXO = ₹1,000 virtual
<button onClick={() => convertNxoToVirtual(convertAmount)}>
    Convert ({convertAmount * 1000} virtual credits)
</button>
```

**Daily Bonus:**
```typescript
const [bonusClaimed, setBonusClaimed] = useState(false);
<button disabled={bonusClaimed} onClick={() => { addReward(10); setBonusClaimed(true); }}>
    Claim Daily Bonus (+10 NXO)
</button>
```
The `bonusClaimed` flag is local state — it resets on page reload, so users could claim multiple times per day by refreshing. This is acceptable for a demo.

**Transaction History:**
Maintains a local `transactions` array (not in PortfolioContext) — amounts shown with +/- sign and colour.

### Issues Identified
* Transaction history is local to `FundsScreen` state — it does not persist and is not synced with `PortfolioContext.orderHistory`.
* Daily bonus reset on page reload — no session persistence.

---

## screens/BidsScreen.tsx

### File Overview
* **File Name**: BidsScreen.tsx  
* **File Path**: `/screens/BidsScreen.tsx`  
* **Module**: Earn Tokens  
* **Layer**: Presentation / Screen  
* **Status**: Active (mock tasks only)

### Purpose
Gamification screen that lists tasks users can complete to earn NXO tokens. Tasks include: complete profile, refer a friend, daily login, complete a trade, watch educational content.

### Dependencies
* **Internal**: `contexts/PortfolioContext` (`addReward`)

### Core Components
Task list with three states: `available`, `inprogress`, `completed`. Each task shows:
- Token reward amount
- Status badge
- Claim button (if available)

On claim: `addReward(task.nxoReward)` → `nxoBalance++`.

### Issues Identified
* All tasks are hardcoded mock data. No real task completion detection (e.g., "complete a trade" does not actually check orderHistory).
* Task state resets on page reload.

---

## screens/ProfileScreen.tsx

### File Overview
* **File Name**: ProfileScreen.tsx  
* **File Path**: `/screens/ProfileScreen.tsx`  
* **Module**: User Profile  
* **Layer**: Presentation / Screen  
* **Status**: Active (local state, no API)

### Purpose
User profile management: personal information, address, bank account details. Provides email change and password change flows via portal modals.

### Dependencies
* **Internal**: `contexts/PortfolioContext` (`addReward` for profile completion bonus), React `createPortal`

### Core Components
Three-section form: Personal Info, Address, Bank Details. All form fields are local `useState` — no API calls.

**Profile Completion Reward:**
```typescript
const handleProfileCompletion = () => {
    addReward(50); // 50 NXO for completing profile
    setProfileCompleted(true);
};
```

**Email Change Modal** — portal-rendered `<form>`:
- Fields: current password, new email, confirm email
- Validation: emails must match; current password checked against hardcoded value

**Password Change Modal** — portal-rendered `<form>`:
- Fields: current password, new password, confirm password

### Issues Identified
* Email and password validation is against hardcoded demo values — not a real backend check.
* Profile data (name, address, bank) is never persisted.

---

## screens/PricingScreen.tsx

### File Overview
* **File Name**: PricingScreen.tsx  
* **File Path**: `/screens/PricingScreen.tsx`  
* **Module**: Pricing Reference  
* **Layer**: Presentation / Screen  
* **Status**: Active (static content)

### Purpose
Static reference page showing the Indian regulatory fee structure for all instrument segments: Equity Delivery, Equity Intraday, Equity F&O, Currency F&O, Commodity F&O.

### Business Function
Educates users on true brokerage costs. Complements `BrokerageCalculatorScreen` by providing the underlying fee schedule that the calculator implements.

### Core Components
**Static charge tables** for each segment:
- Brokerage (₹20/trade or 0.03% for delivery)
- STT/CTT rates
- Exchange transaction charges (NSE/BSE specific rates)
- SEBI charges (₹10 per crore)
- GST (18%)
- Stamp duty (state-specific)

**Worked example** showing gross profit vs net profit after all charges.

### Issues Identified
* Fee rates are hardcoded. Indian regulatory charges (especially exchange transaction charges and stamp duty) change periodically and would need manual updates.

---

## screens/BrokerageCalculatorScreen.tsx

### File Overview
* **File Name**: BrokerageCalculatorScreen.tsx  
* **File Path**: `/screens/BrokerageCalculatorScreen.tsx`  
* **Module**: Brokerage Calculator  
* **Layer**: Presentation / Screen  
* **Status**: Active

### Purpose
Interactive brokerage fee calculator implementing the complete Indian regulatory fee formula for 8 instrument types. Also includes an MTF (Margin Trading Facility) interest calculator.

### Business Function
Enables traders to calculate true net profit/loss including all regulatory charges before placing trades. Critical for understanding actual trade economics.

### Core Components

**`CalculatorCard`** — handles 8 instrument types:
- Equity Delivery, Equity Intraday, Equity F&O (Futures), Equity F&O (Options)
- Currency Futures, Currency Options, Commodity Futures, Commodity Options

**Real-time fee calculation triggers:**
- Buy price, Sell price, Quantity, Exchange (NSE/BSE) inputs
- All fees recalculate on any input change

**Fee formula implementation:**
```typescript
const brokerage = Math.min(orderValue * 0.0003, 20); // ₹20 cap for intraday
const stt = sellValue * 0.001;                        // 0.1% on sell side
const exchangeTxn = (buyValue + sellValue) * 0.0000297; // NSE rate
const gst = (brokerage + exchangeTxn) * 0.18;         // 18% on brokerage+exchange fees
const sebi = (buyValue + sellValue) * 0.000001;        // ₹10/crore
const stampDuty = buyValue * 0.00015;                  // 0.015% on buy
const totalCharges = brokerage + stt + exchangeTxn + gst + sebi + stampDuty;
const netPnl = grossPnl - totalCharges;
```

**`MTFCalculatorCard`:**
- Sliders: invested amount (₹10k–₹10L), days held (1–365), expected return (0–50%)
- Calculation: `mtfInterest = investedAmount * 0.0004 * daysHeld` (0.04%/day)
- Shows: gross return, MTF interest cost, net return, effective annual rate

### Issues Identified
* Exchange transaction charge rates are hardcoded. BSE and NSE update these rates regularly — a real implementation would fetch them from an API or config file.
* STT rate for delivery (0.1% on sell) is shown but delivery has 0.1% on both sides; the code uses sell-only which is technically for intraday.

### Future Enhancements
Add an exchange rate selector (NSE/BSE) that applies different transaction charge rates.

---

## screens/SellingPressureScreen.tsx

### File Overview
* **File Name**: SellingPressureScreen.tsx  
* **File Path**: `/screens/SellingPressureScreen.tsx`  
* **Module**: AI Screener (Stub)  
* **Layer**: Presentation / Screen  
* **Status**: Partial stub

### Purpose
Planned AI-powered screener that identifies stocks under selling pressure before market open (pre-9:30 AM). Currently shows a pre-market placeholder and, as a demo fallback, lists yesterday's negative-change stocks from MOCK_STOCKS.

### Core Components
```typescript
const sellingPressureStocks = MOCK_STOCKS.filter(s => s.change < 0).slice(0, 10);
```
The actual AI analysis is not implemented. The screen shows a placeholder card for pre-9:30 AM and the filtered mock stocks as a preview.

### Issues Identified
The AI analysis engine is not built. This is a placeholder for a planned feature.

---

## screens/PositionsScreen.tsx

### File Overview
* **File Name**: PositionsScreen.tsx  
* **File Path**: `/screens/PositionsScreen.tsx`  
* **Module**: Positions (Stub)  
* **Layer**: Presentation / Screen  
* **Status**: Stub — not functional

### Purpose
Intended to show open intraday positions (as distinct from holdings). Currently renders only a placeholder.

### Core Components
```typescript
return (
    <div className="flex items-center justify-center h-full">
        <p className="text-muted text-xl">This section is under construction</p>
    </div>
);
```

### Issues Identified
Completely non-functional. The `PortfolioScreen` currently shows all holdings (which are effectively overnight positions). A true `PositionsScreen` would show only today's intraday positions and their realised/unrealised P&L.

### Future Enhancements
Implement with columns: symbol, product (MIS/CNC), quantity, buy avg, CMP, P&L, realised P&L.

---

## screens/CoursesScreen.tsx / FeaturesScreen.tsx / HowItWorksScreen.tsx

### File Overview
* **File Names**: CoursesScreen.tsx, FeaturesScreen.tsx, HowItWorksScreen.tsx  
* **File Paths**: `/screens/CoursesScreen.tsx`, `/screens/FeaturesScreen.tsx`, `/screens/HowItWorksScreen.tsx`  
* **Module**: Marketing sub-pages  
* **Layer**: Presentation / Screen  
* **Status**: Active (static content)

### Purpose
Marketing and educational pages accessible from the Landing page navigation. Each has an `onBack` prop to return to the landing screen.

### Core Components
- **CoursesScreen**: Grid of course cards with title, description, duration, difficulty. All "Enroll" buttons show alert stubs.
- **FeaturesScreen**: Feature comparison table — TraVirt vs traditional brokers.
- **HowItWorksScreen**: Step-by-step animated numbered list of how to start trading.

---

## screens/auth/WebAuthScreen.tsx

### File Overview
* **File Name**: WebAuthScreen.tsx  
* **File Path**: `/screens/auth/WebAuthScreen.tsx`  
* **Module**: Authentication Orchestrator  
* **Layer**: Presentation / Auth  
* **Status**: Active (demo auth — no backend)

### Purpose
Orchestrates the login and signup flows. Maintains local state for which auth sub-screen is active (`login`, `signup`, `tfa`) and passes the appropriate callbacks to sub-components.

### Core Components
```typescript
type AuthView = 'login' | 'signup' | 'tfa';
const [view, setView] = useState<AuthView>('login');
```
Renders `WebLoginScreen`, `WebSignUpScreen`, or `WebTfaScreen` based on `view`.

---

## screens/auth/WebLoginScreen.tsx

### File Overview
* **File Name**: WebLoginScreen.tsx  
* **File Path**: `/screens/auth/WebLoginScreen.tsx`  
* **Module**: Login Form  
* **Layer**: Presentation / Auth  
* **Status**: Active (demo)

### Purpose
Credential entry form. Pre-fills demo credentials to allow quick exploration without registration.

### Core Components
```typescript
const [userId, setUserId] = useState('TRDR001');
const [password, setPassword] = useState('password123');
const handleLogin = () => {
    if (userId && password) onSuccess(); // No validation — any non-empty values work
};
```

### Security Notes
The pre-filled credentials (`TRDR001` / `password123`) and no-validation logic are appropriate for a demo/paper-trading app. In a production system, this must be replaced with real backend authentication.

---

## screens/auth/WebSignUpScreen.tsx

### File Overview
* **File Name**: WebSignUpScreen.tsx  
* **File Path**: `/screens/auth/WebSignUpScreen.tsx`  
* **Module**: Registration Flow  
* **Layer**: Presentation / Auth  
* **Status**: Active (simulated)

### Purpose
Three-step registration flow simulating Indian broker onboarding: phone number → OTP verification → 4-digit PIN setup.

### Core Components

**Step 1 — Phone:**
10-digit Indian mobile number validation.

**Step 2 — OTP:**
6-digit OTP input with 65-second countdown timer:
```typescript
const [timer, setTimer] = useState(65);
useEffect(() => {
    const interval = setInterval(() => setTimer(t => t > 0 ? t - 1 : 0), 1000);
    return () => clearInterval(interval);
}, []);
```
Any 6 digits are accepted.

**Step 3 — PIN:**
4-digit PIN with validation:
```typescript
const isValidPin = (pin: string) => {
    return pin.length === 4 && 
           !pin.startsWith('0') && 
           !pin.endsWith('0') &&
           /^\d+$/.test(pin);
};
```

---

## screens/auth/WebTfaScreen.tsx

### File Overview
* **File Name**: WebTfaScreen.tsx  
* **File Path**: `/screens/auth/WebTfaScreen.tsx`  
* **Module**: Two-Factor Authentication  
* **Layer**: Presentation / Auth  
* **Status**: Active (simulated)

### Purpose
6-digit TOTP entry screen. Simulates the second authentication factor expected by Indian brokers. Any 6-digit code is accepted in the demo.

### Core Components
```typescript
const handleSubmit = () => {
    if (code.length === 6) onSuccess(); // No actual TOTP verification
};
```
