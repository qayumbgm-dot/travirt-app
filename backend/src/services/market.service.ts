import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { incCounter, setGauge } from './metrics.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MarketTick {
  symbol: string;
  exchange: string;
  ltp: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  bid?: number;
  ask?: number;
  bidQty?: number;
  askQty?: number;
}

// ─── Seed prices for simulation ───────────────────────────────────────────────

const SEED_STOCKS: MarketTick[] = [
  { symbol: 'RELIANCE',   exchange: 'NSE', ltp: 2850.50, open: 2830, high: 2870, low: 2820, prevClose: 2840, change: 10.5, changePercent: 0.37, volume: 3_200_000 },
  { symbol: 'TCS',        exchange: 'NSE', ltp: 3920.80, open: 3900, high: 3945, low: 3890, prevClose: 3905, change: 15.8, changePercent: 0.40, volume: 1_800_000 },
  { symbol: 'HDFCBANK',   exchange: 'NSE', ltp: 1678.25, open: 1660, high: 1685, low: 1655, prevClose: 1670, change:  8.25, changePercent: 0.49, volume: 5_500_000 },
  { symbol: 'INFY',       exchange: 'NSE', ltp: 1789.60, open: 1770, high: 1800, low: 1765, prevClose: 1780, change:  9.6,  changePercent: 0.54, volume: 2_100_000 },
  { symbol: 'ICICIBANK',  exchange: 'NSE', ltp: 1045.30, open: 1035, high: 1055, low: 1030, prevClose: 1040, change:  5.3,  changePercent: 0.51, volume: 4_800_000 },
  { symbol: 'KOTAKBANK',  exchange: 'NSE', ltp: 1823.75, open: 1810, high: 1835, low: 1805, prevClose: 1815, change:  8.75, changePercent: 0.48, volume: 1_600_000 },
  { symbol: 'BHARTIARTL', exchange: 'NSE', ltp: 1542.40, open: 1530, high: 1555, low: 1525, prevClose: 1535, change:  7.4,  changePercent: 0.48, volume: 2_900_000 },
  { symbol: 'HINDUNILVR', exchange: 'NSE', ltp: 2678.90, open: 2660, high: 2690, low: 2650, prevClose: 2665, change: 13.9,  changePercent: 0.52, volume: 1_200_000 },
  { symbol: 'LT',         exchange: 'NSE', ltp: 3512.60, open: 3490, high: 3530, low: 3485, prevClose: 3500, change: 12.6,  changePercent: 0.36, volume:   980_000 },
  { symbol: 'SBIN',       exchange: 'NSE', ltp:  812.45, open:  805, high:  820, low:  800, prevClose:  808, change:  4.45, changePercent: 0.55, volume: 7_200_000 },
  { symbol: 'ITC',        exchange: 'NSE', ltp:  468.30, open:  462, high:  472, low:  460, prevClose:  465, change:  3.3,  changePercent: 0.71, volume: 8_900_000 },
  { symbol: 'AXISBANK',   exchange: 'NSE', ltp: 1156.80, open: 1145, high: 1165, low: 1140, prevClose: 1150, change:  6.8,  changePercent: 0.59, volume: 3_300_000 },
  { symbol: 'WIPRO',      exchange: 'NSE', ltp:  478.95, open:  472, high:  482, low:  470, prevClose:  475, change:  3.95, changePercent: 0.83, volume: 2_700_000 },
  { symbol: 'TECHM',      exchange: 'NSE', ltp: 1389.50, open: 1375, high: 1400, low: 1370, prevClose: 1382, change:  7.5,  changePercent: 0.54, volume: 1_500_000 },
  { symbol: 'MARUTI',     exchange: 'NSE', ltp: 12450.00, open: 12350, high: 12500, low: 12320, prevClose: 12400, change: 50, changePercent: 0.40, volume: 450_000 },
  { symbol: 'TATASTEEL',  exchange: 'NSE', ltp:  168.90, open:  167, high:  170, low:  166, prevClose:  168, change:  0.9,  changePercent: 0.54, volume: 12_000_000 },
  { symbol: 'EICHERMOT',  exchange: 'NSE', ltp: 4852.30, open: 4820, high: 4875, low: 4810, prevClose: 4840, change: 12.3,  changePercent: 0.25, volume:   320_000 },
  { symbol: 'TITAN',      exchange: 'NSE', ltp: 3724.60, open: 3700, high: 3745, low: 3695, prevClose: 3710, change: 14.6,  changePercent: 0.39, volume:   580_000 },
  { symbol: 'NESTLEIND',  exchange: 'NSE', ltp: 2452.80, open: 2440, high: 2465, low: 2435, prevClose: 2445, change:  7.8,  changePercent: 0.32, volume:   280_000 },
  { symbol: 'ULTRACEMCO', exchange: 'NSE', ltp: 10892.00, open: 10800, high: 10950, low: 10780, prevClose: 10845, change: 47, changePercent: 0.43, volume: 190_000 },
  { symbol: 'NIFTY 50',  exchange: 'NSE', ltp: 24580.00, open: 24450, high: 24630, low: 24400, prevClose: 24520, change: 60, changePercent: 0.24, volume: 0 },
  { symbol: 'NIFTY BANK', exchange: 'NSE', ltp: 52340.00, open: 52100, high: 52500, low: 52050, prevClose: 52250, change: 90, changePercent: 0.17, volume: 0 },
];

// ─── Market Service (singleton) ───────────────────────────────────────────────

class MarketService extends EventEmitter {
  private prices           = new Map<string, MarketTick>();
  private simulationTimer: ReturnType<typeof setInterval> | null = null;
  private aliceWs: WebSocket | null = null;
  private mode: 'SIMULATION' | 'LIVE' | 'CONNECTING' = 'CONNECTING';

  constructor() {
    super();
    this.setMaxListeners(500);
    SEED_STOCKS.forEach((s) => this.prices.set(`${s.exchange}:${s.symbol}`, { ...s }));
  }

  async start(): Promise<void> {
    // Load last-known prices from Redis so snapshot is warm before first tick
    await this.loadSnapshotFromRedis();

    if (env.ALICE_USER_ID && env.ALICE_API_KEY) {
      this.connectAliceBlue();
    } else {
      this.startSimulation();
    }
  }

  stop(): void {
    this.stopSimulation();
    if (this.aliceWs) {
      this.aliceWs.close();
      this.aliceWs = null;
    }
  }

  getMode(): 'SIMULATION' | 'LIVE' | 'CONNECTING' { return this.mode; }

  getSnapshot(): MarketTick[] {
    return Array.from(this.prices.values());
  }

  getPriceMap(): Map<string, number> {
    const map = new Map<string, number>();
    this.prices.forEach((tick, key) => map.set(key, tick.ltp));
    return map;
  }

  getTick(exchange: string, symbol: string): MarketTick | undefined {
    return this.prices.get(`${exchange}:${symbol}`);
  }

  // Subscribe to a live instrument by its Alice Blue token.
  // In SIMULATION mode, seeds a synthetic tick for the token.
  subscribeToken(token: string, exchange: string, symbol: string): void {
    const key = `${exchange}:${symbol}`;
    if (this.prices.has(key)) return; // already tracked

    // Seed a default tick so the symbol appears immediately
    const seed: MarketTick = {
      symbol, exchange, ltp: 0, change: 0, changePercent: 0,
      open: 0, high: 0, low: 0, prevClose: 0, volume: 0,
    };
    this.prices.set(key, seed);

    if (this.mode === 'LIVE' && this.aliceWs?.readyState === 1) {
      this.aliceWs.send(JSON.stringify({
        type:       'subscribe',
        instrument: `${exchange}|${token}`,
      }));
    }
  }

  // ── Snapshot persistence ──────────────────────────────────────────────────

  private async loadSnapshotFromRedis(): Promise<void> {
    try {
      const snap = await redis.hgetall('market:snap');
      if (!snap || Object.keys(snap).length === 0) return;
      let loaded = 0;
      for (const [key, val] of Object.entries(snap)) {
        try {
          const tick = JSON.parse(val) as MarketTick;
          this.prices.set(key, tick);
          loaded++;
        } catch { /* skip malformed entries */ }
      }
      if (loaded > 0) console.log(`[market] Loaded ${loaded} prices from Redis snapshot`);
    } catch { /* non-fatal — proceed with SEED_STOCKS */ }
  }

  // Fire-and-forget: persist tick to Redis hash + publish to pub/sub channel.
  // Both are best-effort — a Redis outage must never block the tick pipeline.
  private persistTick(key: string, tick: MarketTick): void {
    const payload = JSON.stringify(tick);
    redis.hset('market:snap', key, payload).catch(() => {});
    redis.publish('market:ticks', payload).catch(() => {});
  }

  // ── Simulation ────────────────────────────────────────────────────────────

  private startSimulation(): void {
    if (this.simulationTimer) return;
    this.mode = 'SIMULATION';
    setGauge('market_mode_live', 0);

    this.simulationTimer = setInterval(() => {
      this.prices.forEach((tick, key) => {
        const volatility = tick.symbol.includes(' ') ? 0.0005 : 0.001;
        const delta  = tick.ltp * (Math.random() - 0.5) * volatility;
        const newLtp = Math.max(0.05, Math.round((tick.ltp + delta) * 20) / 20);
        const updated: MarketTick = {
          ...tick,
          ltp:           newLtp,
          change:        newLtp - tick.prevClose,
          changePercent: ((newLtp - tick.prevClose) / tick.prevClose) * 100,
          high:          Math.max(tick.high, newLtp),
          low:           Math.min(tick.low, newLtp),
          volume:        tick.volume + Math.floor(Math.random() * 500),
          bid:           Math.round((newLtp - 0.05) * 20) / 20,
          ask:           Math.round((newLtp + 0.05) * 20) / 20,
        };
        this.prices.set(key, updated);
        this.emit('tick', updated);
        this.persistTick(key, updated);
        incCounter('market_ticks_total');
      });
    }, 1000);
  }

  private stopSimulation(): void {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  // ── Alice Blue WebSocket ──────────────────────────────────────────────────

  private connectAliceBlue(): void {
    this.mode = 'CONNECTING';
    try {
      const ws = new WebSocket('wss://ant.aliceblueonline.com/hydrasocket/v2/websocket');
      this.aliceWs = ws;

      ws.on('open', () => {
        // Use Keycloak JWT (ALICE_ACCESS_TOKEN) — falls back to old API key
        const token = (env as any).ALICE_ACCESS_TOKEN ?? env.ALICE_API_KEY;
        ws.send(JSON.stringify({
          type:         'login',
          source:       'WebAPI',
          user_id:      env.ALICE_USER_ID,
          access_token: token,
        }));
      });

      ws.on('message', (raw: WebSocket.RawData) => {
        try {
          const data = JSON.parse(raw.toString());
          if (data.status === 'OK' && data.type === 'login') {
            this.mode = 'LIVE';
            setGauge('market_mode_live', 1);
            this.stopSimulation();
            const symbols = Array.from(this.prices.keys())
              .map((k) => { const [ex, sym] = k.split(':'); return `${ex}|${sym}`; })
              .join('#');
            ws.send(JSON.stringify({ type: 'subscribe', instrument: symbols }));
          } else if (data.lp || data.type === 'quote') {
            this.handleAliceTick(data);
          }
        } catch { /* malformed frame */ }
      });

      ws.on('error', () => {
        console.warn('[market] Alice Blue connection failed — falling back to simulation');
        setGauge('market_mode_live', 0);
        this.startSimulation();
      });

      ws.on('close', () => {
        console.log('[market] Alice Blue disconnected — falling back to simulation');
        setGauge('market_mode_live', 0);
        this.startSimulation();
        setTimeout(() => this.connectAliceBlue(), 30_000);
      });
    } catch {
      this.startSimulation();
    }
  }

  private handleAliceTick(data: Record<string, unknown>): void {
    // Noren tick: { tk: 'NSE|22', lp: '2850.5', h: '2870', l: '2820', v: '3200000', c: '2840', o: '2830', bp1: '2850.4', sp1: '2850.6' }
    const tk = data.tk as string | undefined;
    const parts = tk?.split('|');
    if (!parts || parts.length < 2) return;
    const exchange       = parts[0];
    const tokenOrSymbol  = parts[1];

    let existing: MarketTick | undefined;
    this.prices.forEach((t) => {
      if (t.exchange === exchange && (t.symbol === tokenOrSymbol || !existing)) existing = t;
    });
    if (!existing) return;

    const newLtp    = parseFloat((data.lp ?? data.ltp ?? existing.ltp) as string);
    const prevClose = parseFloat((data.c  ?? data.prevClose ?? existing.prevClose) as string);
    const updated: MarketTick = {
      ...existing,
      ltp:           newLtp,
      change:        newLtp - prevClose,
      changePercent: ((newLtp - prevClose) / prevClose) * 100,
      high:          Math.max(existing.high, parseFloat((data.h ?? existing.high) as string)),
      low:           Math.min(existing.low,  parseFloat((data.l ?? existing.low)  as string)),
      volume:        parseInt((data.v ?? existing.volume) as string, 10) || existing.volume,
      bid:           parseFloat((data.bp1 ?? newLtp) as string),
      ask:           parseFloat((data.sp1 ?? newLtp) as string),
      prevClose,
      open:          parseFloat((data.o ?? existing.open) as string),
    };

    const key = `${exchange}:${existing.symbol}`;
    this.prices.set(key, updated);
    this.emit('tick', updated);
    this.persistTick(key, updated);
    incCounter('market_ticks_total');
  }
}

export const marketService = new MarketService();
