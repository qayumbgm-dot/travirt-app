# Configuration Files

---

## vite.config.ts

### File Overview
* **File Name**: vite.config.ts  
* **File Path**: `/vite.config.ts`  
* **Module**: Build tooling  
* **Layer**: Build / Configuration  
* **Status**: Active

### Purpose
Configures Vite 5 as the build tool and development server for the TraVirt SPA. Enables TypeScript + JSX support via the `@vitejs/plugin-react` plugin.

### Business Function
Enables fast HMR (Hot Module Replacement) during development and produces an optimised production bundle with code splitting, tree-shaking, and asset fingerprinting.

### System Role
Entry point for the Vite build pipeline. Every `npm run dev` and `npm run build` command is governed by this file.

### Dependencies
* **External**: `vite` (^5.0.0), `@vitejs/plugin-react`
* **Internal**: None

### Inputs
* Source files from project root and all subdirectories

### Outputs
* Dev server at `http://localhost:5173` (default)
* Production bundle in `dist/`

### Core Components
```typescript
export default defineConfig({ plugins: [react()] })
```
Minimal configuration — no custom port, no path aliases, no proxy configuration.

### Workflow Integration
The dev workflow is: `npm run dev` → Vite starts → reads this config → serves `index.html` as SPA shell → processes `index.tsx` as entry module.

### Data Flow
Source `.tsx`/`.ts` → `@vitejs/plugin-react` (Babel transform) → browser-native ESM modules during dev; rollup bundle at build time.

### Intelligence Contribution
None.

### Key Code Highlights
No notable highlights — intentionally minimal to rely on Vite defaults.

### Architecture Alignment
Aligns with Vite 5 best practices. The absence of a proxy config means there is no backend API routing — consistent with the pure-SPA, in-memory architecture.

### Issues Identified
* No path aliases configured (e.g. `@/` → `src/`). All imports use relative paths, which become unwieldy in nested components.
* No explicit port configuration, which can conflict with other local services.

### Refactoring Recommendations
Add `resolve.alias: { '@': path.resolve(__dirname, '.') }` to simplify deep relative imports.

### Future Enhancements
If a backend is introduced, add `server.proxy` entries to route `/api/*` to the backend during development.

---

## tsconfig.json

### File Overview
* **File Name**: tsconfig.json  
* **File Path**: `/tsconfig.json`  
* **Module**: TypeScript compiler  
* **Layer**: Build / Configuration  
* **Status**: Active

### Purpose
Defines TypeScript compiler behaviour: strict mode, JSX handling, module resolution strategy, and — critically — the exclusion of the `src/` directory (legacy dead files).

### Business Function
Ensures type safety across the entire codebase and enables IDE support (autocomplete, type errors) for all developers.

### System Role
Consumed by both the Vite build (for type information) and the IDE. `noEmit: true` means TypeScript is type-check-only; Vite/esbuild handles actual transpilation.

### Dependencies
* **External**: TypeScript ^5.2.0

### Inputs
All `.ts`/`.tsx` files except those in the `exclude` list.

### Outputs
Type errors only (no `.js` output files, since `noEmit: true`).

### Core Components
Key settings:
```json
{
  "target": "ES2020",
  "moduleResolution": "bundler",
  "jsx": "react-jsx",
  "strict": true,
  "noEmit": true,
  "exclude": ["node_modules", "dist", "src"]
}
```
The `src/` exclusion is deliberate — it contains legacy duplicate files that are no longer part of the active module graph.

### Architecture Alignment
`"moduleResolution": "bundler"` is the correct setting for Vite 5 projects; it aligns TypeScript module resolution with esbuild's behaviour.

### Issues Identified
* The `src/` directory exclusion silently hides `src/constants.ts` (which contains a leaked Alice Blue API key in plaintext). That file should be deleted, not merely excluded.

### Refactoring Recommendations
Delete `src/constants.ts` and `src/hooks/useMarketData.ts` entirely, then remove the `src/` entry from the `exclude` array.

---

## tailwind.config.js

### File Overview
* **File Name**: tailwind.config.js  
* **File Path**: `/tailwind.config.js`  
* **Module**: Styling / Design System  
* **Layer**: Build / Configuration  
* **Status**: Active

### Purpose
Defines the TraVirt design system on top of Tailwind CSS v3: custom colour tokens, typography scale, box shadows, and animations. All UI components reference these tokens, making the design system a single source of truth.

### Business Function
Ensures visual consistency across the platform. Allows the design language to be changed globally by editing token values here.

### System Role
Consumed by PostCSS at build time. Tailwind's JIT engine scans all content paths to determine which utility classes are actually used and purges unused CSS.

### Dependencies
* **External**: `tailwindcss` ^3.4.0

### Inputs
All `.ts`/`.tsx` files in content scanning paths.

### Outputs
Compiled CSS with only the used utility classes.

### Core Components

**Colour Tokens (dark-first palette):**
```javascript
colors: {
  base:    '#0B1B3F',   // Page background
  surface: '#142952',   // Card/panel background
  overlay: '#1E3A8A',   // Input/hover background
  muted:   '#93C5FD',   // Secondary text, icons
  subtle:  '#BFDBFE',   // Tertiary elements
  primary: '#3B82F6',   // Primary actions (CTA blue)
  accent:  '#7C3AED',   // Purple accents
  success: '#10B981',   // Buy / positive
  danger:  '#EF4444',   // Sell / negative
}
```

**Custom Typography:**
- `Orbitron` — display headings, logo
- `Rajdhani` — numeric data, prices
- `Exo 2` — body text

**Custom Shadows:**
- `glow-blue`: `0 0 15px rgba(59, 130, 246, 0.5)`
- `glow-purple`: `0 0 15px rgba(124, 58, 237, 0.5)`

**Custom Animation:**
- `fade-in`: `translateY(-10px) → translateY(0), opacity 0→1, 0.3s ease-out`

### Workflow Integration
`darkMode: 'class'` — dark mode is always active because `<body>` has the `dark` class set in `index.html`. The platform is dark-only; there is no light-mode toggle.

### Intelligence Contribution
None.

### Issues Identified
* No light mode implementation despite `darkMode: 'class'` allowing for it.
* Content paths include `'**/*.{js,jsx,ts,tsx}'` which may scan `node_modules` if not restricted. A more explicit path like `'./**/*.{ts,tsx}'` with node_modules exclusion would be safer.

### Refactoring Recommendations
Scope content paths more precisely: `['./index.html', './**/*.{ts,tsx}', '!./node_modules/**']`

---

## postcss.config.js

### File Overview
* **File Name**: postcss.config.js  
* **File Path**: `/postcss.config.js`  
* **Module**: CSS Processing  
* **Layer**: Build / Configuration  
* **Status**: Active

### Purpose
Configures the PostCSS transformation pipeline. Two plugins: Tailwind CSS (generates utility classes) and Autoprefixer (adds vendor prefixes for browser compatibility).

### Dependencies
* **External**: `tailwindcss`, `autoprefixer`

### Core Components
```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

### Architecture Alignment
Standard Vite + Tailwind setup. This file must exist before the dev server starts; its absence causes Tailwind classes to silently fail to apply.

### Issues Identified
None. Correctly configured.

---

## package.json

### File Overview
* **File Name**: package.json  
* **File Path**: `/package.json`  
* **Module**: Project manifest  
* **Layer**: Build / Configuration  
* **Status**: Active

### Purpose
Declares all project dependencies, devDependencies, and npm script commands. Pins exact runtime and toolchain versions.

### Core Components

**Runtime Dependencies:**
| Package | Version | Role |
|---------|---------|------|
| `react` | ^18.2.0 | UI framework |
| `react-dom` | ^18.2.0 | React DOM renderer |
| `recharts` | ^2.10.0 | Dashboard index sparklines (AreaChart) |
| `lightweight-charts` | ^4.1.0 | TradingView candlestick charts |
| `@google/genai` | ^1.0.0 | Google Gemini AI client |
| `axios` | ^1.6.0 | HTTP client (not yet used in active code) |

**Development Dependencies:**
| Package | Version | Role |
|---------|---------|------|
| `vite` | ^5.0.0 | Build tool & dev server |
| `typescript` | ^5.2.0 | Type checker |
| `@vitejs/plugin-react` | ^4.2.0 | React + JSX transform for Vite |
| `tailwindcss` | ^3.4.0 | Utility-first CSS framework |
| `postcss` | ^8.4.0 | CSS pipeline |
| `autoprefixer` | ^10.4.0 | Vendor prefix automation |

**NPM Scripts:**
```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview"
}
```

### Issues Identified
* `axios` is installed but unused in active source files (was imported in legacy `src/` hook).
* `"type": "module"` requires all config files to use ES module syntax or `.cjs` extension — correctly handled.

### Refactoring Recommendations
Remove `axios` from dependencies unless a backend API integration is planned.

---

## .env

### File Overview
* **File Name**: .env  
* **File Path**: `/.env`  
* **Module**: Runtime configuration  
* **Layer**: Build / Configuration  
* **Status**: Active (all values blank)

### Purpose
Provides runtime environment variables to the Vite build. All four variables are currently blank, causing the platform to operate entirely in simulation mode.

### Core Components
```env
VITE_API_KEY=           # Google Gemini AI key → geminiService.ts
VITE_WS_URL=            # Custom WebSocket URL → src/constants.ts (dead file)
VITE_ALICE_USER_ID=     # Alice Blue user ID → constants.ts
VITE_ALICE_API_KEY=     # Alice Blue API key → constants.ts
```

### Workflow Integration
* **Blank `VITE_ALICE_USER_ID` / `VITE_ALICE_API_KEY`**: `useMarketData.ts` detects empty credentials and calls `startMockData()` instead of attempting the WebSocket connection.
* **Blank `VITE_API_KEY`**: `geminiService.ts` initialises `ai = null` and returns a fallback string from `summarizeNews()`.

### Security Notes
* This file should be in `.gitignore`. Because all values are blank in the committed version, no credentials are leaked.
* The legacy `src/constants.ts` (excluded from compilation but present on disk) contains a hardcoded Alice Blue API key — that file must be deleted.

### Architecture Alignment
Correct use of Vite's `VITE_` prefix convention for client-side environment variable exposure.
