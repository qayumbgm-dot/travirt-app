import { redis } from '../config/redis';
import { env } from '../config/env';
import { incCounter } from './metrics.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OhlcvBar {
  time:   number; // Unix timestamp (seconds)
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

// ─── Cache TTLs ───────────────────────────────────────────────────────────────

const TTL_INTRADAY  = 300;    // 5 min — today's bars may still be forming
const TTL_HISTORICAL = 86_400; // 24 h — past bars are immutable

// ─── Public API ───────────────────────────────────────────────────────────────

export const getHistoricalData = async (
  symbol: string,
  exchange: string,
  interval: string,
  from: number,
  to: number,
): Promise<OhlcvBar[]> => {
  const cacheKey = `market:hist:${exchange}:${symbol}:${interval}:${from}-${to}`;

  // 1. Redis cache hit
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      incCounter('market_hist_cache_hits');
      return JSON.parse(cached) as OhlcvBar[];
    }
  } catch { /* non-fatal */ }

  incCounter('market_hist_cache_misses');

  // 2. Alice Blue REST history (only when credentials are present)
  let bars: OhlcvBar[] | null = null;
  if (env.ALICE_USER_ID && env.ALICE_API_KEY) {
    bars = await fetchFromAliceBlue(symbol, exchange, interval, from, to);
  }

  // 3. Deterministic simulation fallback
  if (!bars || bars.length === 0) {
    bars = generateSimulatedBars(symbol, exchange, interval, from, to);
  }

  // 4. Cache result
  const todayStr = new Date().toDateString();
  const toStr    = new Date(to * 1000).toDateString();
  const ttl = toStr === todayStr ? TTL_INTRADAY : TTL_HISTORICAL;
  try {
    await redis.set(cacheKey, JSON.stringify(bars), 'EX', ttl);
  } catch { /* non-fatal */ }

  return bars;
};

// ─── Alice Blue REST history ──────────────────────────────────────────────────

// Alice Blue ANT chart history API (TradingView-compatible response)
// Response shape: { s: "ok", t: number[], o: number[], h: number[], l: number[], c: number[], v: number[] }
interface AliceHistoryResponse {
  s?: string;
  t?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
}

const fetchFromAliceBlue = async (
  symbol: string,
  exchange: string,
  interval: string,
  from: number,
  to: number,
): Promise<OhlcvBar[] | null> => {
  try {
    const params = new URLSearchParams({
      symbol,
      exchange,
      startTime: String(from),
      endTime:   String(to),
      resolution: interval,
    });
    const url = `https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/chart/history?${params}`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.ALICE_API_KEY}`,
        'User-Agent': 'TraVirt/1.0',
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as AliceHistoryResponse;
    if (data.s !== 'ok' || !data.t?.length) return null;

    return data.t.map((time, i) => ({
      time,
      open:   data.o![i] ?? 0,
      high:   data.h![i] ?? 0,
      low:    data.l![i] ?? 0,
      close:  data.c![i] ?? 0,
      volume: data.v?.[i] ?? 0,
    }));
  } catch {
    return null;
  }
};

// ─── Simulation fallback ──────────────────────────────────────────────────────

const SEED_CLOSE: Record<string, number> = {
  'NSE:RELIANCE':   2850.50,
  'NSE:TCS':        3920.80,
  'NSE:HDFCBANK':   1678.25,
  'NSE:INFY':       1789.60,
  'NSE:ICICIBANK':  1045.30,
  'NSE:KOTAKBANK':  1823.75,
  'NSE:BHARTIARTL': 1542.40,
  'NSE:HINDUNILVR': 2678.90,
  'NSE:LT':         3512.60,
  'NSE:SBIN':        812.45,
  'NSE:ITC':         468.30,
  'NSE:AXISBANK':   1156.80,
  'NSE:WIPRO':       478.95,
  'NSE:TECHM':      1389.50,
  'NSE:MARUTI':    12450.00,
  'NSE:NIFTY 50':  24580.00,
  'NSE:NIFTY BANK': 52340.00,
};

const intervalSeconds = (interval: string): number => {
  const map: Record<string, number> = {
    '1min':   60,
    '5min':   300,
    '15min':  900,
    '30min':  1_800,
    '60min':  3_600,
    '1hour':  3_600,
    '1day':   86_400,
    '1week':  604_800,
  };
  return map[interval] ?? 300;
};

// Seeded PRNG so bars are deterministic per (symbol, time) — avoids random
// data changing on every cache miss during development.
const seededRand = (seed: number): number => {
  const x = Math.sin(seed) * 10_000;
  return x - Math.floor(x);
};

const generateSimulatedBars = (
  symbol: string,
  exchange: string,
  interval: string,
  from: number,
  to: number,
): OhlcvBar[] => {
  const key   = `${exchange}:${symbol}`;
  const step  = intervalSeconds(interval);
  const bars: OhlcvBar[] = [];

  // Walk price forward from a base that's consistent with seed prices
  let price = SEED_CLOSE[key] ?? 1000;
  const seedOffset = from + key.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  for (let t = from; t <= to; t += step) {
    const r        = seededRand(t + seedOffset);
    const change   = price * (r - 0.495) * 0.008;
    const open     = price;
    const close    = Math.max(0.05, +(price + change).toFixed(2));
    const high     = +(Math.max(open, close) * (1 + seededRand(t + seedOffset + 1) * 0.003)).toFixed(2);
    const low      = +(Math.min(open, close) * (1 - seededRand(t + seedOffset + 2) * 0.003)).toFixed(2);
    const volume   = Math.floor(seededRand(t + seedOffset + 3) * 500_000 + 100_000);

    bars.push({ time: t, open: +open.toFixed(2), high, low, close, volume });
    price = close;
  }

  return bars;
};
