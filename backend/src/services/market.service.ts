import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { env } from '../config/env';
import { pool } from '../database/pool';
import { redis } from '../config/redis';
import { incCounter, setGauge } from './metrics.service';
import { getWsSessionToken, createWsSession } from '../integrations/aliceBlue';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MarketTick {
  symbol:        string;
  exchange:      string;
  ltp:           number;
  change:        number;
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

// ─── Seed prices — simulation fallback ───────────────────────────────────────

const SEED_STOCKS: MarketTick[] = [
  { symbol: 'RELIANCE-EQ',   exchange: 'NSE', ltp: 2850.50, open: 2830,  high: 2870,  low: 2820,  prevClose: 2840,  change: 10.5,  changePercent: 0.37, volume: 3_200_000 },
  { symbol: 'TCS-EQ',        exchange: 'NSE', ltp: 3920.80, open: 3900,  high: 3945,  low: 3890,  prevClose: 3905,  change: 15.8,  changePercent: 0.40, volume: 1_800_000 },
  { symbol: 'HDFCBANK-EQ',   exchange: 'NSE', ltp: 1678.25, open: 1660,  high: 1685,  low: 1655,  prevClose: 1670,  change:  8.25, changePercent: 0.49, volume: 5_500_000 },
  { symbol: 'INFY-EQ',       exchange: 'NSE', ltp: 1789.60, open: 1770,  high: 1800,  low: 1765,  prevClose: 1780,  change:  9.6,  changePercent: 0.54, volume: 2_100_000 },
  { symbol: 'ICICIBANK-EQ',  exchange: 'NSE', ltp: 1045.30, open: 1035,  high: 1055,  low: 1030,  prevClose: 1040,  change:  5.3,  changePercent: 0.51, volume: 4_800_000 },
  { symbol: 'SBIN-EQ',       exchange: 'NSE', ltp:  812.45, open:  805,  high:  820,  low:  800,  prevClose:  808,  change:  4.45, changePercent: 0.55, volume: 7_200_000 },
  { symbol: 'ITC-EQ',        exchange: 'NSE', ltp:  468.30, open:  462,  high:  472,  low:  460,  prevClose:  465,  change:  3.3,  changePercent: 0.71, volume: 8_900_000 },
  { symbol: 'AXISBANK-EQ',   exchange: 'NSE', ltp: 1156.80, open: 1145,  high: 1165,  low: 1140,  prevClose: 1150,  change:  6.8,  changePercent: 0.59, volume: 3_300_000 },
  { symbol: 'WIPRO-EQ',      exchange: 'NSE', ltp:  478.95, open:  472,  high:  482,  low:  470,  prevClose:  475,  change:  3.95, changePercent: 0.83, volume: 2_700_000 },
  { symbol: 'MARUTI-EQ',     exchange: 'NSE', ltp: 12450.0, open: 12350, high: 12500, low: 12320, prevClose: 12400, change: 50,    changePercent: 0.40, volume:   450_000 },
  { symbol: 'TATASTEEL-EQ',  exchange: 'NSE', ltp:  168.90, open:  167,  high:  170,  low:  166,  prevClose:  168,  change:  0.9,  changePercent: 0.54, volume: 12_000_000 },
  { symbol: 'TITAN-EQ',      exchange: 'NSE', ltp: 3724.60, open: 3700,  high: 3745,  low: 3695,  prevClose: 3710,  change: 14.6,  changePercent: 0.39, volume:   580_000 },
  { symbol: 'Nifty 50',      exchange: 'NSE', ltp: 24580.0, open: 24450, high: 24630, low: 24400, prevClose: 24520, change: 60,    changePercent: 0.24, volume:         0 },
  { symbol: 'Nifty Bank',    exchange: 'NSE', ltp: 52340.0, open: 52100, high: 52500, low: 52050, prevClose: 52250, change: 90,    changePercent: 0.17, volume:         0 },
];

// ─── Market Service (singleton) ───────────────────────────────────────────────

class MarketService extends EventEmitter {
  // prices: keyed by "EXCHANGE:symbol" — the live LTP map for all ticking instruments
  private prices = new Map<string, MarketTick>();
  // tokenToSymbol: "EXCHANGE:numericToken" → "tradingSymbol"
  // Populated from the instruments table so every NorenWS tick can be resolved to a name
  private tokenToSymbol = new Map<string, string>();

  private simulationTimer: ReturnType<typeof setInterval> | null = null;
  private aliceWs: WebSocket | null = null;
  private mode: 'SIMULATION' | 'LIVE' | 'CONNECTING' = 'CONNECTING';

  constructor() {
    super();
    this.setMaxListeners(1000);
    SEED_STOCKS.forEach((s) => this.prices.set(`${s.exchange}:${s.symbol}`, { ...s }));
  }

  // ── Startup ───────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    await this.loadSnapshotFromRedis();
    await this.loadTokenMap();

    const jwtToken = env.ALICE_ACCESS_TOKEN ?? env.ALICE_API_KEY;
    if (jwtToken && env.ALICE_USER_ID) {
      if (this.tokenToSymbol.size > 0) {
        // Instruments already in DB — connect immediately and subscribe all
        this.connectAliceBlue();
      } else {
        // First run: DB empty — start simulation and wait for resubscribeAll()
        // to be called by server.ts after the instrument master finishes loading
        this.startSimulation();
        console.log('[market] Instruments not yet loaded — simulation mode until refresh completes');
      }
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

  // ── Public accessors ──────────────────────────────────────────────────────

  getMode(): 'SIMULATION' | 'LIVE' | 'CONNECTING' { return this.mode; }

  getSnapshot(): MarketTick[] { return Array.from(this.prices.values()); }

  getPriceMap(): Map<string, number> {
    const map = new Map<string, number>();
    this.prices.forEach((tick, key) => map.set(key, tick.ltp));
    return map;
  }

  getTick(exchange: string, symbol: string): MarketTick | undefined {
    return this.prices.get(`${exchange}:${symbol}`);
  }

  // Called after instrument master refresh — reloads token map so any future tick
  // for a newly loaded instrument can be resolved. Also connects if not yet live.
  async resubscribeAll(): Promise<void> {
    await this.loadTokenMap();
    if (this.tokenToSymbol.size === 0) return;

    const jwtToken = env.ALICE_ACCESS_TOKEN ?? env.ALICE_API_KEY;
    const wsOpen   = this.aliceWs?.readyState === WebSocket.OPEN;

    if (wsOpen) {
      // Re-subscribe whatever is actively tracked (instruments in prices map)
      this.sendActiveSubscriptions(this.aliceWs!);
    } else if (jwtToken && env.ALICE_USER_ID && this.mode !== 'CONNECTING') {
      console.log('[market] Instruments ready — triggering live feed connection...');
      this.stopSimulation();
      this.connectAliceBlue();
    }
  }

  // Subscribe a single instrument on-demand (call this when a user views an instrument).
  // Adds it to the token map + prices map; sends subscribe message if WS is live.
  subscribeInstrument(token: string, exchange: string, symbol: string): void {
    const mapKey   = `${exchange}:${token}`;
    const priceKey = `${exchange}:${symbol}`;

    // Keep token map up-to-date for tick resolution
    if (!this.tokenToSymbol.has(mapKey)) {
      this.tokenToSymbol.set(mapKey, symbol);
    }

    // Seed a price entry so the symbol appears in snapshots immediately
    if (!this.prices.has(priceKey)) {
      this.prices.set(priceKey, {
        symbol, exchange,
        ltp: 0, open: 0, high: 0, low: 0, prevClose: 0,
        change: 0, changePercent: 0, volume: 0,
      });
    }

    // Subscribe on the live WS
    if (this.mode === 'LIVE' && this.aliceWs?.readyState === WebSocket.OPEN) {
      this.aliceWs.send(JSON.stringify({ t: 't', k: `${exchange}|${token}` }));
    }
  }

  // ── Token map — instrument master ─────────────────────────────────────────
  // Loads every (exchange, token, symbol) row so ticks for any instrument can
  // be resolved to a trading symbol without a DB round-trip per tick.

  private async loadTokenMap(): Promise<void> {
    try {
      const { rows } = await pool.query<{ token: string; exchange: string; symbol: string }>(
        'SELECT token, exchange, symbol FROM instruments',
      );
      this.tokenToSymbol.clear();
      for (const r of rows) {
        this.tokenToSymbol.set(`${r.exchange}:${r.token}`, r.symbol);
      }
      console.log(`[market] Token map: ${this.tokenToSymbol.size.toLocaleString()} instruments`);
    } catch (err) {
      console.warn('[market] Token map load failed:', (err as Error).message);
    }
  }

  // Subscribe instruments currently tracked in this.prices (seed stocks + on-demand adds).
  // Called on every WS connect so active subscriptions survive reconnects.
  // NorenWS format: {"t":"t","k":"NSE|2885#NSE|1594"}
  private sendActiveSubscriptions(ws: WebSocket): void {
    if (ws.readyState !== WebSocket.OPEN) return;

    // Reverse-lookup: for each priced symbol, find its numeric token
    const keys: string[] = [];
    this.prices.forEach((tick) => {
      for (const [mapKey, sym] of this.tokenToSymbol) {
        if (sym === tick.symbol && mapKey.startsWith(`${tick.exchange}:`)) {
          keys.push(`${tick.exchange}|${mapKey.slice(tick.exchange.length + 1)}`);
          break;
        }
      }
    });

    if (keys.length === 0) return;
    const BATCH = 200;
    for (let i = 0; i < keys.length; i += BATCH) {
      if (ws.readyState !== WebSocket.OPEN) break;
      ws.send(JSON.stringify({ t: 't', k: keys.slice(i, i + BATCH).join('#') }));
    }
    console.log(`[market] Subscribed ${keys.length} active instruments`);
  }

  // ── Snapshot persistence (Redis) ──────────────────────────────────────────

  private async loadSnapshotFromRedis(): Promise<void> {
    try {
      const snap = await redis.hgetall('market:snap');
      if (!snap || Object.keys(snap).length === 0) return;
      let loaded = 0;
      for (const [key, val] of Object.entries(snap)) {
        try {
          this.prices.set(key, JSON.parse(val) as MarketTick);
          loaded++;
        } catch { /* skip malformed */ }
      }
      if (loaded > 0) console.log(`[market] Loaded ${loaded.toLocaleString()} prices from Redis`);
    } catch { /* non-fatal */ }
  }

  private persistTick(key: string, tick: MarketTick): void {
    const payload = JSON.stringify(tick);
    redis.hset('market:snap', key, payload).catch(() => {});
    redis.publish('market:ticks', payload).catch(() => {});
  }

  // ── Simulation (when no live token) ──────────────────────────────────────

  private startSimulation(): void {
    if (this.simulationTimer) return;
    this.mode = 'SIMULATION';
    setGauge('market_mode_live', 0);

    this.simulationTimer = setInterval(() => {
      this.prices.forEach((tick, key) => {
        if (tick.ltp === 0) return; // skip zero-price entries (not yet ticked live)
        const volatility = tick.symbol.includes(' ') ? 0.0005 : 0.001;
        const delta  = tick.ltp * (Math.random() - 0.5) * volatility;
        const newLtp = Math.max(0.05, Math.round((tick.ltp + delta) * 20) / 20);
        const updated: MarketTick = {
          ...tick,
          ltp:           newLtp,
          change:        newLtp - tick.prevClose,
          changePercent: tick.prevClose > 0 ? ((newLtp - tick.prevClose) / tick.prevClose) * 100 : 0,
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

  // ── Alice Blue NorenWS connection ─────────────────────────────────────────
  // Auth flow: createWsSess → connect → handshake with sha256(sha256(jwt)) →
  // subscribe ALL tokens in batches → heartbeat every 50s.

  private connectAliceBlue(): void {
    // Guard: don't open a second connection while one is already connecting or live
    const state = this.aliceWs?.readyState;
    if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) return;

    this.mode = 'CONNECTING';
    const jwtToken = env.ALICE_ACCESS_TOKEN ?? env.ALICE_API_KEY ?? '';
    const clientId = env.ALICE_USER_ID ?? '';

    createWsSession(jwtToken, clientId)
      .catch((err) => console.warn('[market] createWsSess failed (proceeding anyway):', err.message))
      .finally(() => this._openNorenSocket(jwtToken, clientId));
  }

  private _openNorenSocket(jwtToken: string, clientId: string): void {
    try {
      const ws = new WebSocket('wss://ws1.aliceblueonline.com/NorenWS/');
      this.aliceWs = ws;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

      ws.on('open', () => {
        ws.send(JSON.stringify({
          t:           'c',
          susertoken:  getWsSessionToken(jwtToken),
          uid:         `${clientId}_API`,
          actid:       `${clientId}_API`,
          source:      'API',
        }));
      });

      ws.on('message', (raw: WebSocket.RawData) => {
        try {
          const data = JSON.parse(raw.toString());
          const t = data.t ?? data.type;

          if ((t === 'cf' || t === 'ck') && (data.k ?? data.s ?? '').toUpperCase() === 'OK') {
            // ── Connected — go live and subscribe full universe ──────────────
            this.mode = 'LIVE';
            setGauge('market_mode_live', 1);
            this.stopSimulation();
            console.log('[market] Alice Blue LIVE — subscribing full instrument universe...');

            heartbeatTimer = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'h', k: '' }));
            }, 50_000);

            // Subscribe all currently tracked instruments (seed stocks + anything added on-demand)
            this.sendActiveSubscriptions(ws);

          } else if (t === 'tk' || t === 'tf') {
            // ── Tick frame ────────────────────────────────────────────────────
            this.handleNorenTick(data);
          }
        } catch { /* malformed frame — ignore */ }
      });

      ws.on('error', () => {
        console.warn('[market] Alice Blue WS error — falling back to simulation');
        setGauge('market_mode_live', 0);
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
        this.startSimulation();
      });

      ws.on('close', () => {
        console.log('[market] Alice Blue disconnected — simulation, retry in 30s');
        setGauge('market_mode_live', 0);
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
        this.startSimulation();
        setTimeout(() => this.connectAliceBlue(), 30_000);
      });

    } catch {
      this.startSimulation();
    }
  }

  // ── Tick handler ─────────────────────────────────────────────────────────
  // NorenWS payload: { t:"tk"|"tf", e:"NSE", tk:"2885", lp:"2850.5",
  //   h:"2870", l:"2820", v:"3200000", c:"2840", o:"2830", bp1:"2850.4", sp1:"2850.6" }
  //
  // t:"tk" = full snapshot for the instrument (first tick after subscribe)
  // t:"tf" = delta update (only changed fields present)

  private handleNorenTick(data: Record<string, unknown>): void {
    const tokenStr = data.tk as string | undefined;
    const exchange = (data.e as string | undefined)?.toUpperCase() ?? '';
    if (!tokenStr || !exchange) return;

    const mapKey = `${exchange}:${tokenStr}`;
    const symbol = this.tokenToSymbol.get(mapKey);
    if (!symbol) return; // token not in our instrument universe — ignore

    const priceKey = `${exchange}:${symbol}`;
    const existing = this.prices.get(priceKey);

    // First tick for this instrument: create entry from snapshot fields
    if (!existing) {
      const ltp      = parseFloat((data.lp ?? '0') as string);
      const prevClose = parseFloat((data.c ?? '0') as string);
      const entry: MarketTick = {
        symbol,
        exchange,
        ltp,
        prevClose,
        open:          parseFloat((data.o ?? ltp.toString()) as string),
        high:          parseFloat((data.h ?? ltp.toString()) as string),
        low:           parseFloat((data.l ?? ltp.toString()) as string),
        change:        prevClose > 0 ? ltp - prevClose : 0,
        changePercent: prevClose > 0 ? ((ltp - prevClose) / prevClose) * 100 : 0,
        volume:        parseInt((data.v ?? '0') as string, 10) || 0,
        bid:           data.bp1 ? parseFloat(data.bp1 as string) : undefined,
        ask:           data.sp1 ? parseFloat(data.sp1 as string) : undefined,
      };
      this.prices.set(priceKey, entry);
      this.emit('tick', entry);
      this.persistTick(priceKey, entry);
      incCounter('market_ticks_total');
      return;
    }

    // Delta update: merge changed fields onto existing tick
    const newLtp    = data.lp !== undefined ? parseFloat(data.lp as string) : existing.ltp;
    const prevClose = data.c  !== undefined ? parseFloat(data.c  as string) : existing.prevClose;
    const updated: MarketTick = {
      ...existing,
      ltp:           newLtp,
      prevClose,
      change:        prevClose > 0 ? newLtp - prevClose : existing.change,
      changePercent: prevClose > 0 ? ((newLtp - prevClose) / prevClose) * 100 : existing.changePercent,
      open:          data.o  !== undefined ? parseFloat(data.o  as string) : existing.open,
      high:          data.h  !== undefined ? Math.max(existing.high, parseFloat(data.h as string)) : existing.high,
      low:           data.l  !== undefined ? Math.min(
                       existing.low === 0 ? newLtp : existing.low,
                       parseFloat(data.l as string),
                     ) : existing.low,
      volume:        data.v  !== undefined ? (parseInt(data.v as string, 10) || existing.volume) : existing.volume,
      bid:           data.bp1 !== undefined ? parseFloat(data.bp1 as string) : existing.bid,
      ask:           data.sp1 !== undefined ? parseFloat(data.sp1 as string) : existing.ask,
    };

    this.prices.set(priceKey, updated);
    this.emit('tick', updated);
    this.persistTick(priceKey, updated);
    incCounter('market_ticks_total');
  }
}

export const marketService = new MarketService();
