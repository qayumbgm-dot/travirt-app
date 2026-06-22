// Instrument Master Service
// Loads all tradeable instruments from the Alice Blue V2 Contract Master (public, no auth needed).
// Covers NSE, BSE, NFO (F&O), MCX, CDS.  Refreshes daily at 08:00 IST.

import { pool } from '../database/pool';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Instrument {
  token:           string;
  symbol:          string;
  name:            string;
  exchange:        string;
  segment:         string;
  instrument_type: string;
  expiry:          string | null;
  strike:          number | null;
  lot_size:        number;
  tick_size:       number;
  isin:            string | null;
}

// ─── Alice Blue V2 Contract Master (public endpoint, no auth) ─────────────────
// https://v2api.aliceblueonline.com/restpy/static/contract_master/V2/{exch}
// Returns JSON: { "NSE": [ { token, symbol, trading_symbol, ... }, ... ] }

const CM_BASE = 'https://v2api.aliceblueonline.com/restpy/static/contract_master/V2';
const EXCHANGES = ['NSE', 'BSE', 'NFO', 'MCX', 'CDS'] as const;

interface V2Row {
  token:              string;
  symbol:             string;
  trading_symbol:     string;
  formatted_ins_name?: string;
  exch:               string;
  exchange_segment:   string;
  group_name?:        string;
  instrument_type?:   string;
  option_type?:       string;
  expiry_date?:       number | null;
  strike_price?:      string | null;
  lot_size:           string;
  tick_size:          string;
}

function msToDate(ms: number | null | undefined): string | null {
  if (!ms || ms <= 0) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

function resolveType(row: V2Row): string {
  const opt = (row.option_type ?? '').toUpperCase();
  if (opt === 'CE') return 'CE';
  if (opt === 'PE') return 'PE';
  const it = (row.instrument_type ?? '').toUpperCase();
  if (it.includes('FUT')) return 'FUT';
  return 'EQ';
}

async function loadExchange(exch: string): Promise<Instrument[]> {
  try {
    const resp = await fetch(`${CM_BASE}/${exch}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'gzip' },
      signal:  AbortSignal.timeout(120_000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json() as Record<string, V2Row[]>;
    const rows = data[exch] ?? [];
    const out: Instrument[] = [];

    for (const row of rows) {
      if (!row.token || !row.trading_symbol) continue;
      const strikeNum = parseFloat(row.strike_price ?? '-1');
      const tradingSym = row.trading_symbol.trim();
      const baseName   = (row.formatted_ins_name ?? tradingSym).trim();

      // BSE equities have no suffix (symbol = trading_symbol = name = "RELIANCE").
      // Append exchange tag so they're visually distinct from NSE listings in search.
      const isBseEquity = exch === 'BSE' && tradingSym === (row.symbol ?? '').trim();
      const displaySym  = isBseEquity ? `${tradingSym}-BSE` : tradingSym;
      const displayName = isBseEquity ? `${baseName} (BSE)` : baseName;

      out.push({
        token:           row.token.trim(),
        symbol:          displaySym,
        name:            displayName,
        exchange:        (row.exch || exch).toUpperCase(),
        segment:         (row.exchange_segment || exch).toUpperCase().replace(/-/g, '_'),
        instrument_type: resolveType(row),
        expiry:          msToDate(row.expiry_date),
        strike:          strikeNum > 0 ? strikeNum : null,
        lot_size:        parseInt(row.lot_size ?? '1', 10) || 1,
        tick_size:       parseFloat(row.tick_size ?? '0.05') || 0.05,
        isin:            null,
      });
    }

    console.log(`[instruments] ${exch}: ${out.length} contracts`);
    return out;
  } catch (err) {
    console.warn(`[instruments] ${exch} download failed:`, (err as Error).message);
    return [];
  }
}

// ─── Upsert into DB ──────────────────────────────────────────────────────────

async function upsertInstruments(instruments: Instrument[]): Promise<number> {
  if (instruments.length === 0) return 0;

  const BATCH = 500;
  let total = 0;
  for (let i = 0; i < instruments.length; i += BATCH) {
    const batch  = instruments.slice(i, i + BATCH);
    const values = batch.map((_, idx) => {
      const b = idx * 11;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11})`;
    }).join(',');

    const params = batch.flatMap(ins => [
      ins.token, ins.symbol, ins.name, ins.exchange, ins.segment,
      ins.instrument_type, ins.expiry, ins.strike, ins.lot_size, ins.tick_size, ins.isin,
    ]);

    await pool.query(`
      INSERT INTO instruments
        (token, symbol, name, exchange, segment, instrument_type, expiry, strike, lot_size, tick_size, isin)
      VALUES ${values}
      ON CONFLICT (token, exchange) DO UPDATE SET
        symbol          = EXCLUDED.symbol,
        name            = EXCLUDED.name,
        segment         = EXCLUDED.segment,
        instrument_type = EXCLUDED.instrument_type,
        expiry          = EXCLUDED.expiry,
        strike          = EXCLUDED.strike,
        lot_size        = EXCLUDED.lot_size,
        tick_size       = EXCLUDED.tick_size,
        refreshed_at    = NOW()
    `, params);
    total += batch.length;
  }
  return total;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function refreshInstruments(_aliceToken?: string): Promise<void> {
  console.log('[instruments] Starting instrument master refresh...');

  // Download all exchanges concurrently (NFO is 40 MB — largest, ~2 min)
  const results = await Promise.allSettled(
    EXCHANGES.map(ex => loadExchange(ex)),
  );

  let total = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.length > 0) {
      total += await upsertInstruments(r.value);
    }
  }
  console.log(`[instruments] Refresh complete — ${total.toLocaleString()} instruments upserted`);
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchResult extends Instrument { id: number }

export async function searchInstruments(
  query:     string,
  exchange?: string,
  segment?:  string,
  limit      = 20,
): Promise<SearchResult[]> {
  const conditions: string[] = [];
  const params: unknown[]    = [];
  let   p = 1;

  if (query) {
    conditions.push(`(symbol ILIKE $${p} OR to_tsvector('english', name) @@ plainto_tsquery('english', $${p+1}))`);
    params.push(`${query}%`, query);
    p += 2;
  }
  if (exchange) { conditions.push(`exchange = $${p++}`); params.push(exchange.toUpperCase()); }
  if (segment)  { conditions.push(`segment  = $${p++}`); params.push(segment.toUpperCase()); }

  params.push(Math.min(limit, 100));
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query<SearchResult>(
    `SELECT id, token, symbol, name, exchange, segment, instrument_type,
            expiry, strike, lot_size, tick_size, isin
     FROM instruments ${where}
     ORDER BY
       CASE WHEN symbol ILIKE $1 THEN 0 ELSE 1 END,
       length(symbol), symbol
     LIMIT $${p}`,
    params,
  );
  return rows;
}

export async function getInstrumentByToken(token: string, exchange: string): Promise<SearchResult | null> {
  const { rows } = await pool.query<SearchResult>(
    `SELECT * FROM instruments WHERE token = $1 AND exchange = $2 LIMIT 1`,
    [token, exchange.toUpperCase()],
  );
  return rows[0] ?? null;
}

// Lookup by human symbol (e.g. "RELIANCE") — matches "RELIANCE-EQ", "RELIANCE-BSE", or exact.
export async function getInstrumentBySymbol(symbol: string, exchange: string): Promise<SearchResult | null> {
  const upper = symbol.trim().toUpperCase();
  const exch  = exchange.toUpperCase();
  const suffix = exch === 'BSE' ? `${upper}-BSE` : `${upper}-EQ`;
  const { rows } = await pool.query<SearchResult>(
    `SELECT * FROM instruments
     WHERE exchange = $1
       AND (symbol = $2 OR symbol = $3 OR symbol ILIKE $4)
     ORDER BY
       CASE WHEN symbol = $2 THEN 0 WHEN symbol = $3 THEN 1 ELSE 2 END,
       length(symbol)
     LIMIT 1`,
    [exch, upper, suffix, `${upper}%`],
  );
  return rows[0] ?? null;
}

// ─── Option chain ─────────────────────────────────────────────────────────────

export interface OptionChainRow {
  strike:    number;
  expiry:    string;
  ce_token:  string | null;
  pe_token:  string | null;
  ce_symbol: string | null;
  pe_symbol: string | null;
  lot_size:  number;
}

export async function getOptionChain(underlying: string, expiry?: string): Promise<OptionChainRow[]> {
  const params: unknown[] = [`${underlying.toUpperCase()}%`];
  let p = 2;
  let expiryClause = '';

  if (expiry) {
    expiryClause = `AND expiry = $${p++}`;
    params.push(expiry);
  }

  const { rows } = await pool.query<{
    strike: number; expiry: string; option_type: string; token: string; symbol: string; lot_size: number;
  }>(
    `SELECT strike, expiry::text, instrument_type as option_type, token, symbol, lot_size
     FROM instruments
     WHERE symbol ILIKE $1
       AND instrument_type IN ('CE','PE')
       AND expiry >= CURRENT_DATE
       ${expiryClause}
     ORDER BY expiry, strike`,
    params,
  );

  const map = new Map<string, OptionChainRow>();
  for (const row of rows) {
    const key = `${row.expiry}_${row.strike}`;
    if (!map.has(key)) {
      map.set(key, { strike: row.strike, expiry: row.expiry, ce_token: null, pe_token: null, ce_symbol: null, pe_symbol: null, lot_size: row.lot_size });
    }
    const entry = map.get(key)!;
    if (row.option_type === 'CE') { entry.ce_token = row.token; entry.ce_symbol = row.symbol; }
    if (row.option_type === 'PE') { entry.pe_token = row.token; entry.pe_symbol = row.symbol; }
  }
  return Array.from(map.values());
}

export async function getExpiries(underlying: string): Promise<string[]> {
  const { rows } = await pool.query<{ expiry: string }>(
    `SELECT DISTINCT expiry::text FROM instruments
     WHERE symbol ILIKE $1 AND instrument_type IN ('CE','PE','FUT') AND expiry >= CURRENT_DATE
     ORDER BY expiry`,
    [`${underlying.toUpperCase()}%`],
  );
  return rows.map(r => r.expiry);
}

export async function getInstrumentCount(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*)::text as count FROM instruments');
  return parseInt(rows[0].count, 10);
}
