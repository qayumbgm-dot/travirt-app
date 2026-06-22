# Legacy Files & Documentation Index

---

## src/constants.ts (Legacy / Dead File)

### File Overview
* **File Name**: constants.ts  
* **File Path**: `/src/constants.ts`  
* **Module**: LEGACY — Static Data  
* **Layer**: Dead Code  
* **Status**: **DEPRECATED — Not compiled (excluded from tsconfig.json)**

### Purpose
An earlier version of `/constants.ts` from a previous project structure. Contains the same static data as the active `constants.ts` but also includes a hardcoded Alice Blue API key.

### Critical Security Issue
```typescript
// LINE 7-10 — PRODUCTION API KEY IN PLAINTEXT
export const ALICE_BLUE_CREDENTIALS = {
    userId: '455612',
    apiKey: 'PM4LKQHNgq5GUyZCKUSTqiUNOJN8eWEXPvWQWRAGKjHPcf4rJ8g6GTuhbU6eTnOQ...',
};
```
This file is excluded from TypeScript compilation by `tsconfig.json`'s `"exclude": ["src"]` directive, so it is not part of the built application. However, the API key is in plaintext on disk and would be included in any Git commit or source code export.

### Differences from Active constants.ts
1. `ALICE_BLUE_CREDENTIALS` uses hardcoded values instead of environment variables
2. Uses `BROADCAST_WS_URL` constant referencing `VITE_WS_URL` env var (not present in active file)
3. Identical `MOCK_STOCKS`, `MOCK_INDICES`, `DISCOVER_LISTS`, `CONSTITUENTS_MAP` data

### Action Required
**Delete this file immediately.** Its presence is a security risk. The active `/constants.ts` already uses environment variables correctly.

```bash
# To remove:
rm src/constants.ts
```

---

## src/hooks/useMarketData.ts (Legacy / Dead File)

### File Overview
* **File Name**: useMarketData.ts  
* **File Path**: `/src/hooks/useMarketData.ts`  
* **Module**: LEGACY — Market Data Hook  
* **Layer**: Dead Code  
* **Status**: **DEPRECATED — Not compiled (excluded from tsconfig.json)**

### Purpose
An earlier version of `/hooks/useMarketData.ts`. Nearly identical in structure and logic to the active version, but with subtle differences (reads from the legacy `src/constants.ts` which has hardcoded credentials).

### Differences from Active hooks/useMarketData.ts
1. Imports from `../constants` and `../types` (relative paths from `src/`)
2. The `TickData` type is imported from `../types` — this type definition may only exist in the legacy `src/types.ts` (if it exists)
3. Simulation logic is substantially the same random walk implementation

### Action Required
**Delete this file.** It is dead code and its dependency on the security-compromised `src/constants.ts` makes it doubly problematic.

```bash
rm -rf src/
```
If `src/` contains only these two files, the entire directory can be removed. Verify with `ls src/` before deletion.

---

## Documentation Index

All documentation for the TraVirt platform is located in the `/docs/` directory:

| File | Contents |
|------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Platform architecture overview, module map, data flow diagrams, traceability map, cross-file interaction map, environment variable reference |
| [01_configuration.md](01_configuration.md) | `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `package.json`, `.env` |
| [02_entry_points.md](02_entry_points.md) | `index.html`, `index.css`, `index.tsx`, `App.tsx` |
| [03_domain_model.md](03_domain_model.md) | `types.ts`, `constants.ts`, `utils/formatters.ts` |
| [04_hooks_contexts_services.md](04_hooks_contexts_services.md) | `hooks/useMarketData.ts`, `hooks/useIndexData.ts`, `contexts/PortfolioContext.tsx`, `contexts/WatchlistContext.tsx`, `services/geminiService.ts` |
| [05_screens.md](05_screens.md) | All 14 screens + 4 auth screens |
| [06_components_layout_common.md](06_components_layout_common.md) | `Logo.tsx`, `WebHeader.tsx`, `ProfileDropdown.tsx`, `DisclaimerModal.tsx`, `TrialPlanModal.tsx`, `Tooltip.tsx` |
| [07_components_trade_panels.md](07_components_trade_panels.md) | `WatchlistPanel.tsx`, `WatchlistTabs.tsx`, `OrderWindow.tsx`, `ChartPanel.tsx`, `ChartWindow.tsx`, `IndicesPanel.tsx` |
| [08_components_trade_modals_menus.md](08_components_trade_modals_menus.md) | `OptionChainPanel.tsx`, `MarketDepthModal.tsx`, `ManageWatchlistsModal.tsx`, `MoreOptionsMenu.tsx`, `TradeModals.tsx`, `StockRow.tsx`, `MarketDepthPanel.tsx`, `NotesEditor.tsx`, `WatchlistSettingsPanel.tsx` |
| [09_legacy_and_index.md](09_legacy_and_index.md) | `src/constants.ts`, `src/hooks/useMarketData.ts`, this index |

---

## Quick Reference — File Count by Layer

| Layer | Count | Files |
|-------|-------|-------|
| Build / Config | 6 | vite.config, tsconfig, tailwind.config, postcss.config, package.json, .env |
| HTML Shell | 2 | index.html, index.css |
| Application Entry | 2 | index.tsx, App.tsx |
| Domain Model | 3 | types.ts, constants.ts, utils/formatters.ts |
| Hooks | 2 | useMarketData.ts, useIndexData.ts |
| Contexts | 2 | PortfolioContext.tsx, WatchlistContext.tsx |
| Services | 1 | geminiService.ts |
| Screens | 18 | 14 application screens + 4 auth screens |
| Components (Layout) | 3 | WebHeader.tsx, ProfileDropdown.tsx, Logo.tsx |
| Components (Common) | 3 | DisclaimerModal.tsx, TrialPlanModal.tsx, Tooltip.tsx |
| Components (Trade) | 12 | WatchlistPanel, WatchlistTabs, OrderWindow, ChartPanel, ChartWindow, IndicesPanel, OptionChainPanel, MarketDepthModal, ManageWatchlistsModal, MoreOptionsMenu, TradeModals (×2 exports) |
| Components (Watchlist sub) | 4 | StockRow, MarketDepthPanel, NotesEditor, WatchlistSettingsPanel |
| Legacy (Dead) | 2 | src/constants.ts, src/hooks/useMarketData.ts |
| **Total** | **60** | |

---

## Platform-Wide Conventions

### Naming
- Component files: `PascalCase.tsx`
- Hook files: `camelCase.ts` with `use` prefix
- Context files: `PascalCase.tsx`
- Utility files: `camelCase.ts`
- Screen files: `PascalCase.tsx` in `/screens/`

### Colour Semantics
- `text-success` / `bg-success` (#10B981): Buy, positive change, gains
- `text-danger` / `bg-danger` (#EF4444): Sell, negative change, losses
- `text-primary` / `bg-primary` (#3B82F6): Primary actions, active states
- `text-muted` (#93C5FD): Secondary text, icons, placeholders

### Instrument Key Format
All watchlist storage uses `"EXCHANGE:SYMBOL"` composite keys. Single-exchange symbols (e.g., `"NSE:TATASTEEL"`) prevent ambiguity when the same stock trades on both NSE and BSE.

### Portal Pattern
Modals, tooltips, context menus, and floating panels use `ReactDOM.createPortal(…, document.body)` to escape `overflow: hidden` and `z-index` stacking contexts.

### Context Access
```typescript
// Always use the named hook, never useContext(PortfolioContext) directly
const { portfolio, marketData, executeTrade } = usePortfolio();
const { watchlists, addStockToWatchlist } = useWatchlist();
```

### Environment Guard Pattern
```typescript
// Prevents crashes when optional integrations are not configured
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;
const ws = userId && apiKey ? new WebSocket(url) : null;
```
