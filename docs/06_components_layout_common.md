# UI Components — Layout, Auth & Common

---

## components/auth/Logo.tsx

### File Overview
* **File Name**: Logo.tsx  
* **File Path**: `/components/auth/Logo.tsx`  
* **Module**: Brand / Identity  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
Renders the TraVirt brand logo as an inline SVG. Used in auth screens and potentially the header.

### Business Function
Visual brand anchor. The two-triangle geometry symbolises trading trends (upward blue triangle + downward purple triangle).

### Core Components
```tsx
// Two triangles forming the "V" in TraVirt
<svg viewBox="0 0 50 50">
    <polygon points="0,0 25,50 50,0" fill="#007BFF" opacity="0.9"/>   {/* Blue */}
    <polygon points="0,50 25,0 50,50" fill="#8A2BE2" opacity="0.7"/>  {/* Purple */}
</svg>
```
Both colours match the Tailwind config `primary` (#3B82F6 → close to #007BFF) and `accent` (#7C3AED → close to #8A2BE2).

### Issues Identified
The SVG colour values (#007BFF, #8A2BE2) are hardcoded and do not reference Tailwind CSS custom properties. If the design tokens change, the logo colours will not update automatically.

### Refactoring Recommendations
Use `currentColor` or CSS custom properties in the SVG fill to inherit theme colours.

---

## components/layout/WebHeader.tsx

### File Overview
* **File Name**: WebHeader.tsx  
* **File Path**: `/components/layout/WebHeader.tsx`  
* **Module**: Navigation Header  
* **Layer**: Presentation / Layout  
* **Status**: Active

### Purpose
The sticky application header. Displays the TraVirt logo, pinned index tickers, primary navigation links (with keyboard shortcut badges), a market status indicator, and the user profile dropdown.

### Business Function
Primary navigation hub. The market status badge immediately communicates to the trader whether they are seeing live prices or a simulation. Pinned tickers provide constant visibility of key indices.

### System Role
Always visible when authenticated. Reads from both `WatchlistContext` (pinned items) and `PortfolioContext` (market status). Uses `useIndexData` for live ticker values.

### Dependencies
* **Internal**: `contexts/PortfolioContext`, `contexts/WatchlistContext`, `hooks/useIndexData`, `components/layout/ProfileDropdown`, `App.tsx` (Screen type)
* **External**: None

### Inputs
```typescript
interface WebHeaderProps {
    activeScreen: Screen;
    setActiveScreen: (screen: Screen) => void;
    onLogout: () => void;
}
```

### Outputs
A fixed-top header bar with:
- Logo (left)
- Pinned tickers (center-left): up to 2 index symbols from `WatchlistContext.pinnedItems`
- Nav links (center): Dashboard, Portfolio, Leaderboard, Orders, Positions, Funds, Earn Tokens
- Dropdown: Pricing (Charges List + Calculator), AI News  
- Market status badge (right of nav)
- Profile dropdown button (right)

### Core Components

**Market Status Badge:**
```tsx
const StatusBadge: React.FC<{ status: MarketStatus }> = ({ status }) => {
    if (status === 'LIVE') return (
        <span className="flex items-center gap-1.5 text-success text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"/>
            LIVE
        </span>
    );
    if (status === 'SIMULATION') return (
        <span className="text-orange-400 text-xs font-semibold">SIM</span>
    );
    return <span className="text-muted text-xs animate-pulse">Connecting...</span>;
};
```

**Pinned Tickers:**
```tsx
const { data: indexData } = useIndexData(pinnedItems.map(parseInstrumentKey).map(k => k.symbol));
{pinnedItems.slice(0, 2).map(key => {
    const { symbol } = parseInstrumentKey(key);
    const quote = indexData[symbol];
    return <div key={key}>{symbol}: {formatCurrency(quote?.ltp ?? 0)}</div>;
})}
```

**Navigation:**
All primary nav items call `setActiveScreen(screenName)`. The active screen is highlighted with `border-b-2 border-primary` styling.

**Pricing Dropdown:**
```tsx
<div className="relative group">
    <button>Pricing <i className="fas fa-chevron-down"/></button>
    <div className="absolute hidden group-hover:block bg-surface ...">
        <button onClick={() => setActiveScreen('pricing')}>Charges List</button>
        <button onClick={() => setActiveScreen('brokerageCalculator')}>Calculator</button>
    </div>
</div>
```
CSS-hover-based dropdown (no state needed).

### Issues Identified
* "Leaderboard" nav link navigates to a screen that does not exist in `renderScreen()` — this would silently render nothing.
* The Pricing dropdown uses CSS hover for show/hide. On touch devices, hover doesn't work reliably.

### Refactoring Recommendations
1. Remove or stub the Leaderboard nav link until the screen is implemented.
2. Replace CSS hover dropdown with `useState`-controlled open/close for touch compatibility.

---

## components/layout/ProfileDropdown.tsx

### File Overview
* **File Name**: ProfileDropdown.tsx  
* **File Path**: `/components/layout/ProfileDropdown.tsx`  
* **Module**: User Menu  
* **Layer**: Presentation / Layout  
* **Status**: Active

### Purpose
Dropdown menu triggered from the header's profile avatar button. Provides quick access to profile settings, support (stub), and logout.

### Core Components
```tsx
<div className="bg-surface rounded-lg shadow-xl border border-overlay animate-fade-in">
    <button onClick={() => setActiveScreen('profile')}>My Profile</button>
    <button onClick={() => alert('Settings coming soon')}>Settings</button>
    <button onClick={() => alert('Support coming soon')}>Support</button>
    <button onClick={onLogout}>Logout</button>
</div>
```

### Issues Identified
Settings and Support are `alert()` stubs. These should navigate to dedicated screens or link to external help resources.

---

## components/common/DisclaimerModal.tsx

### File Overview
* **File Name**: DisclaimerModal.tsx  
* **File Path**: `/components/common/DisclaimerModal.tsx`  
* **Module**: Onboarding  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
First modal shown to a user immediately after authentication. Presents a bilingual (English + Hindi) legal disclaimer about the virtual nature of the platform and the risks of trading.

### Business Function
Legal risk disclosure. Satisfies regulatory requirements for trading platforms operating in India to display risk warnings. The bilingual format serves the platform's target audience.

### Core Components
```tsx
<div className="fixed inset-0 bg-black bg-opacity-80 z-[1000] flex items-center justify-center">
    <div className="bg-surface rounded-xl p-8 max-w-lg">
        <h2>Important Disclaimer / महत्वपूर्ण अस्वीकरण</h2>
        {/* English disclaimer text */}
        {/* Hindi disclaimer text */}
        <button onClick={onAccept}>I Understand, Proceed</button>
    </div>
</div>
```
`z-index: 1000` ensures it overlays everything including other modals.

### Issues Identified
* `onAccept` closes the modal and triggers `TrialPlanModal` — this sequence is managed in `App.tsx` state. If the user refreshes, they see the disclaimer again (no persistence of acceptance).

---

## components/common/TrialPlanModal.tsx

### File Overview
* **File Name**: TrialPlanModal.tsx  
* **File Path**: `/components/common/TrialPlanModal.tsx`  
* **Module**: Onboarding  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
Second onboarding modal, shown after the disclaimer is accepted. Welcomes the user, shows their 1-year trial plan with an expiry date, and plays a confetti animation.

### Business Function
Positive first impression. Communicates the value proposition (free 1-year trial) and creates an engaging welcome moment.

### Core Components

**Confetti animation:**
```typescript
const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    duration: `${0.8 + Math.random() * 1.2}s`,
    color: ['#3B82F6', '#7C3AED', '#10B981', '#F59E0B'][Math.floor(Math.random() * 4)]
}));
```
Each particle uses an inline `@keyframes fall` CSS animation that runs once on mount.

**Plan expiry calculation:**
```typescript
const expiryDate = new Date();
expiryDate.setFullYear(expiryDate.getFullYear() + 1);
const formattedExpiry = expiryDate.toLocaleDateString('en-IN', { ... });
```

### Issues Identified
The `@keyframes fall` animation is defined as an inline `<style>` tag inside the component — this works but is not ideal. Prefer defining animations in `tailwind.config.js` or `index.css`.

---

## components/common/Tooltip.tsx

### File Overview
* **File Name**: Tooltip.tsx  
* **File Path**: `/components/common/Tooltip.tsx`  
* **Module**: Common UI  
* **Layer**: Presentation / Component  
* **Status**: Active

### Purpose
Portal-rendered tooltip that renders above its trigger element with smart viewport edge detection. Supports an optional `shortcut` text label (e.g., "Ctrl+Enter").

### Business Function
Provides accessible, visually consistent help text for icon buttons throughout the trading UI, where limited space means text labels are omitted.

### System Role
The canonical tooltip implementation. `WatchlistTabs.tsx` and `MarketDepthModal.tsx` each contain local duplicate implementations that should be replaced with this component.

### Dependencies
* **External**: React `createPortal`, `useId`, `useLayoutEffect`
* **Internal**: None

### Core Components

**Viewport edge detection:**
```typescript
useLayoutEffect(() => {
    if (visible && triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        
        let left = triggerRect.left + triggerRect.width / 2;
        
        // Clamp to viewport edges
        if (left - tooltipRect.width / 2 < 8) left = 8 + tooltipRect.width / 2;
        if (left + tooltipRect.width / 2 > viewportWidth - 8) {
            left = viewportWidth - 8 - tooltipRect.width / 2;
        }
        
        const arrowLeft = (triggerRect.left + triggerRect.width / 2 - left + tooltipRect.width / 2);
        // Sets --arrow-left CSS custom property for dynamic arrow positioning
    }
}, [visible]);
```

**Portal rendering:**
```tsx
{mounted && createPortal(
    <div ref={tooltipRef} role="tooltip" id={tooltipId} style={style}>
        <span>{title}</span>
        {shortcut && <kbd className="ml-2 text-[9px] opacity-70">{shortcut}</kbd>}
        <div className="tooltip-arrow" style={{ left: `var(--arrow-left)` }} />
    </div>,
    document.body
)}
```

**`useId()`** provides a unique ID for ARIA `aria-describedby` linking — correct accessibility pattern.

**`mounted` state** prevents `createPortal` from attempting to access `document.body` during SSR or before the DOM is ready.

### Architecture Alignment
Exemplary pattern for cross-stacking-context UI. Portal rendering ensures the tooltip always appears on top regardless of `overflow: hidden` or `z-index` stacking in parent containers.

### Issues Identified
* Two additional tooltip implementations exist as local copies in `WatchlistTabs.tsx` and `MarketDepthModal.tsx`. These should be replaced with imports of this shared component.

### Refactoring Recommendations
Find and replace all local `Tooltip` implementations with `import Tooltip from '../common/Tooltip'` (or the appropriate relative path).
