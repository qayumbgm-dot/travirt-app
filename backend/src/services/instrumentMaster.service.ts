// Instrument Master Service
// Downloads all tradeable instruments from NSE/BSE official sources and
// Alice Blue (when authorized). Refreshes daily at 08:00 IST pre-market.
// Provides fast full-text search across 50k+ instruments.

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

// ─── NSE equity source (public, no auth) ─────────────────────────────────────

const NSE_EQUITY_URL = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';
const NSE_FO_LOTS_URL = 'https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv';

// Alice Blue scrip master URLs (work when API is authorized)
const ALICE_SCRIP_BASE = 'https://v2api.aliceblueonline.com/restpy/static/v2';
const ALICE_SCRIP_URLS: Record<string, string> = {
  NSE:  `${ALICE_SCRIP_BASE}/NSEscripmaster.csv`,
  BSE:  `${ALICE_SCRIP_BASE}/BSEscripmaster.csv`,
  NFO:  `${ALICE_SCRIP_BASE}/NFOscripmaster.csv`,
  MCX:  `${ALICE_SCRIP_BASE}/MCXscripmaster.csv`,
  CDS:  `${ALICE_SCRIP_BASE}/CDSscripmaster.csv`,
  BFO:  `${ALICE_SCRIP_BASE}/BFOscripmaster.csv`,
};

// ─── NSE equity CSV parser ────────────────────────────────────────────────────
// Format: SYMBOL,NAME OF COMPANY,SERIES,DATE OF LISTING,PAID UP VALUE,MARKET LOT,ISIN NUMBER,FACE VALUE

async function loadNseEquities(): Promise<Instrument[]> {
  try {
    const resp = await fetch(NSE_EQUITY_URL, {
      headers: { 'Accept-Encoding': 'gzip' },
      signal:  AbortSignal.timeout(30_000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text  = await resp.text();
    const lines = text.split('\n').slice(1); // skip header
    const out: Instrument[] = [];

    for (const line of lines) {
      const cols = line.split(',');
      if (cols.length < 7) continue;
      const symbol = cols[0]?.trim();
      const name   = cols[1]?.trim();
      const isin   = cols[6]?.trim();
      if (!symbol || !name) continue;

      out.push({
        token:           symbol,
        symbol,
        name,
        exchange:        'NSE',
        segment:         'NSE_CM',
        instrument_type: 'EQ',
        expiry:          null,
        strike:          null,
        lot_size:        1,
        tick_size:       0.05,
        isin:            isin || null,
      });
    }
    console.log(`[instruments] NSE equities loaded: ${out.length}`);
    return out;
  } catch (err) {
    console.warn('[instruments] NSE equity fetch failed:', (err as Error).message);
    return [];
  }
}

// ─── Alice Blue CSV parser ────────────────────────────────────────────────────
// Format: Exch,ExchType,Token,Lotsize,Symbol,Name,Expiry,Strike,OptionType,PriceTick,...

async function loadAliceScrips(exchange: string, url: string, authToken?: string): Promise<Instrument[]> {
  try {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const resp = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const text  = await resp.text();
    const lines = text.split('\n').slice(1);
    const out: Instrument[] = [];

    for (const line of lines) {
      const cols = line.split(',');
      if (cols.length < 9) continue;
      const [exch, , token, lotStr, symbol, name, expiry, strikeStr, optType, tickStr] = cols;
      if (!token || !symbol) continue;

      const strikeNum = parseFloat(strikeStr ?? '0');
      const segment =
        exchange === 'NFO' ? 'NSE_FO' :
        exchange === 'BSE' ? 'BSE_CM' :
        exchange === 'BFO' ? 'BSE_FO' :
        exchange === 'MCX' ? 'MCX'    :
        exchange === 'CDS' ? 'CDS'    : 'NSE_CM';

      const instrType =
        optType === 'CE' ? 'CE' :
        optType === 'PE' ? 'PE' :
        optType === 'XX' ? 'FUT' : 'EQ';

      out.push({
        token:           token.trim(),
        symbol:          symbol.trim(),
        name:            name?.trim() || symbol.trim(),
        exchange:        (exch || exchange).trim(),
        segment,
        instrument_type: instrType,
        expiry:          expiry?.trim() || null,
        strike:          isNaN(strikeNum) || strikeNum === 0 ? null : strikeNum,
        lot_size:        parseInt(lotStr ?? '1', 10) || 1,
        tick_size:       parseFloat(tickStr ?? '0.05') || 0.05,
        isin:            null,
      });
    }
    console.log(`[instruments] ${exchange} scrips loaded: ${out.length}`);
    return out;
  } catch (err) {
    console.warn(`[instruments] ${exchange} fetch failed:`, (err as Error).message);
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
    const values = batch.map((ins, idx) => {
      const b = idx * 11;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11})`;
    }).join(',');

    const params = batch.flatMap(ins => [
      ins.token, ins.symbol, ins.name, ins.exchange, ins.segment,
      ins.instrument_type, ins.expiry, ins.strike, ins.lot_size, ins.tick_size, ins.isin,
    ]);

    await pool.query(`
      INSERT INTO instruments
        (token, symbol, name, exchange, segment, instrument_type, expiry, strike, lot_size, tick_size, isin, refreshed_at)
      VALUES ${values.replace(/\$(\d+)/g, (_, n) => `$${n}`)}
      ON CONFLICT (token, exchange) DO UPDATE SET
        symbol          = EXCLUDED.symbol,
        name            = EXCLUDED.name,
        segment         = EXCLUDED.segment,
        instrument_type = EXCLUDED.instrument_type,
        expiry          = EXCLUDED.expiry,
        strike          = EXCLUDED.strike,
        lot_size        = EXCLUDED.lot_size,
        tick_size       = EXCLUDED.tick_size,
        isin            = EXCLUDED.isin,
        refreshed_at    = NOW()
    `, params);
    total += batch.length;
  }
  return total;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function refreshInstruments(aliceToken?: string): Promise<void> {
  console.log('[instruments] Starting instrument master refresh...');

  const results = await Promise.allSettled([
    loadNseEquities(),
    // Alice Blue scrips — load all segments (works when API is authorized)
    ...Object.entries(ALICE_SCRIP_URLS).map(([ex, url]) => loadAliceScrips(ex, url, aliceToken)),
  ]);

  let total = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.length > 0) {
      total += await upsertInstruments(r.value);
    }
  }
  console.log(`[instruments] Refresh complete — ${total} instruments upserted`);
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchResult extends Instrument {
  id: number;
}

export async function searchInstruments(
  query:    string,
  exchange?: string,
  segment?: string,
  limit     = 20,
): Promise<SearchResult[]> {
  const conditions: string[] = [];
  const params: unknown[]    = [];
  let   p = 1;

  if (query) {
    conditions.push(`(
      symbol ILIKE $${p} OR
      to_tsvector('english', name) @@ plainto_tsquery('english', $${p+1})
    )`);
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
     FROM instruments
     ${where}
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

// ─── Option chain ─────────────────────────────────────────────────────────────

export interface OptionChainRow {
  strike:     number;
  expiry:     string;
  ce_token:   string | null;
  pe_token:   string | null;
  ce_symbol:  string | null;
  pe_symbol:  string | null;
  lot_size:   number;
}

export async function getOptionChain(underlying: string, expiry?: string): Promise<OptionChainRow[]> {
  const params: unknown[] = [`%${underlying}%`];
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
     WHERE name ILIKE $1
       AND instrument_type IN ('CE','PE')
       AND expiry >= CURRENT_DATE
       ${expiryClause}
     ORDER BY expiry, strike`,
    params,
  );

  // Pivot CE/PE into single rows
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
     WHERE name ILIKE $1 AND instrument_type IN ('CE','PE','FUT') AND expiry >= CURRENT_DATE
     ORDER BY expiry`,
    [`%${underlying}%`],
  );
  return rows.map(r => r.expiry);
}

export async function getInstrumentCount(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*)::text as count FROM instruments');
  return parseInt(rows[0].count, 10);
}
