# Market Data Middleware Layer

## Problem

Alice Blue enforces per-account rate limits, session limits, and WebSocket subscription ceilings. The naive approach — each user opening their own Alice Blue session — fails at any meaningful scale: N users → N sessions → N times the rate limit consumption.

## Solution: Fetch Once, Serve Many

A single backend process holds **one** Alice Blue WebSocket connection (or one simulation timer). All price data flows through a central `MarketService` (Node.js `EventEmitter`) and is distributed to consumers internally — never re-fetched per user.

```
Alice Blue WebSocket  (1 connection, always)
        │
        ▼
  MarketService  ──────────────────────────────────────────────────┐
  (EventEmitter)                                                   │
        │                                                          │
        ├──► alert.worker.ts       (price alert evaluation)       │
        ├──► limitOrder.worker.ts  (limit / SL order fills)       │
        ├──► gtt.worker.ts         (GTT trigger evaluation)       │
        └──► market.routes.ts      (browser WS fan-out)           │
                    │                                              │
                    ▼                              Redis pub/sub ◄─┘
         SubscriptionManager                   (multi-process readiness)
         (per-symbol filtering)
                    │
          ┌─────────┴─────────┐
       Socket A            Socket B
    (NSE:RELIANCE)      (NSE:TCS, NSE:INFY)
```

---

## Components

### `backend/src/services/market.service.ts`

Singleton `MarketService extends EventEmitter`. Holds the single Alice Blue WS connection (or simulation interval). Emits `tick` events internally for all consumers.

**Key behaviors:**
- `start()` is `async` — loads Redis snapshot before connecting, so workers see warm prices from the first tick
- Simulation mode: 1-second interval updating all 22 seed instruments with small random deltas
- Live mode: Alice Blue Noren WS protocol (`login` → `subscribe` → tick frames)
- Auto-fallback: on WS error or close → simulation starts, reconnect attempted after 30s
- `persistTick()` is fire-and-forget — Redis I/O never blocks the tick pipeline

```typescript
// Single connection per process
export const marketService = new MarketService();

// All internal workers consume ticks via EventEmitter
marketService.on('tick', (tick: MarketTick) => { ... });

// Redis persistence on every tick (fire-and-forget)
redis.hset('market:snap', key, JSON.stringify(tick)).catch(() => {});
redis.publish('market:ticks', JSON.stringify(tick)).catch(() => {});
```

### `backend/src/websockets/subscriptionManager.ts`

Bidirectional maps enabling O(1) per-symbol fan-out without iterating all sockets.

```typescript
// socket → Set<symbolKey>   e.g. socket → { "NSE:RELIANCE", "NSE:TCS" }
private readonly socketSymbols = new Map<WebSocket, Set<string>>();

// symbolKey → Set<WebSocket>   e.g. "NSE:RELIANCE" → { socketA, socketB }
private readonly symbolSockets = new Map<string, Set<WebSocket>>();
```

**Wildcard mode:** New connections have no subscriptions. `isWildcard(socket)` returns `true` → socket receives every tick. Once the client sends `{ "type": "subscribe", "symbols": [...] }` it exits wildcard mode and only gets its chosen symbols.

**Metrics:** Updates `market_ws_connections` and `market_subscribed_symbols` Prometheus gauges on every add/remove/cleanup.

### `backend/src/services/historicalData.service.ts`

Three-tier fallback for OHLCV bars:

1. **Redis cache** — `market:hist:{exchange}:{symbol}:{interval}:{from}-{to}` with 5-min TTL for today's bars, 24h TTL for past dates
2. **Alice Blue REST** — `GET https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/chart/history` (TradingView-compatible response: `{ s, t, o, h, l, c, v }`)
3. **Deterministic simulation** — seeded PRNG (`Math.sin(t + seedOffset)`) produces stable bars per (symbol, time) so cache misses in dev don't produce random noise

Tracks `market_hist_cache_hits` and `market_hist_cache_misses` counters.

---

## API Surface

| Endpoint | Protocol | Description |
|---|---|---|
| `GET /api/market/ws` | WebSocket | Tick stream with per-symbol subscription filtering |
| `GET /api/market/snapshot` | HTTP | Full price snapshot for all instruments |
| `GET /api/market/history` | HTTP | OHLCV bars with Redis cache |
| `GET /api/market/stats` | HTTP | Connection count, unique symbols, top symbols |

### WebSocket Protocol

```jsonc
// Client → Server
{ "type": "subscribe",   "symbols": ["NSE:RELIANCE", "NSE:TCS"] }
{ "type": "unsubscribe", "symbols": ["NSE:RELIANCE"] }

// Server → Client (on connect)
{ "type": "snapshot", "mode": "SIMULATION", "data": [ ...MarketTick ] }

// Server → Client (on subscribe ack)
{ "type": "subscribed", "symbols": ["NSE:RELIANCE"] }

// Server → Client (tick — only for subscribed symbols after first subscribe)
{ "type": "tick", "data": { ...MarketTick } }
```

### History Query Parameters

```
GET /api/market/history?symbol=RELIANCE&exchange=NSE&interval=1day&from=1700000000&to=1710000000
```

| Param | Type | Constraint |
|---|---|---|
| `symbol` | string | 1–50 chars |
| `exchange` | string | default `NSE` |
| `interval` | enum | `1min` `5min` `15min` `30min` `60min` `1hour` `1day` `1week` |
| `from` | unix timestamp | must be < `to` |
| `to` | unix timestamp | max range: 2 years of minute bars |

---

## Redis Key Schema

| Key | Type | Content | TTL |
|---|---|---|---|
| `market:snap` | Hash | `{symbolKey}` → JSON `MarketTick` | None (overwritten on each tick) |
| `market:ticks` | Pub/Sub channel | JSON `MarketTick` | N/A |
| `market:hist:{ex}:{sym}:{interval}:{from}-{to}` | String | JSON `OhlcvBar[]` | 5min (intraday) / 24h (historical) |

---

## Scalability Properties

| Concern | Behavior |
|---|---|
| Alice Blue rate limits | 1 connection regardless of user count |
| WS session exhaustion | 1 session per process; Redis pub/sub enables horizontal scaling |
| Browser client count | Bounded only by server RAM and EventEmitter listener count (max set to 500) |
| Historical data load | Redis cache absorbs repeated requests; Alice Blue REST only called on cache miss |
| Redis outage | All Redis calls are fire-and-forget; outage degrades snapshot persistence but does not break tick delivery |
| Alice Blue outage | Automatic fallback to simulation; 30s reconnect loop |

---

## MarketTick Shape

```typescript
export interface MarketTick {
  symbol:        string;
  exchange:      string;
  ltp:           number;  // last traded price
  change:        number;  // absolute change from prevClose
  changePercent: number;
  open:          number;
  high:          number;
  low:           number;
  prevClose:     number;
  volume:        number;
  bid?:          number;
  ask?:          number;
  bidQty?:       number;
  askQty?:       number;
}
```
