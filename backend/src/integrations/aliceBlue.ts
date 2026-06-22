// Alice Blue A3 Open API integration.
// Base: https://a3.aliceblueonline.com/open-api/od/v1
// Auth: Keycloak JWT Bearer token (ALICE_ACCESS_TOKEN in env).
// Order placement uses numeric instrumentId (token) from the V2 contract master.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { env } from '../config/env';

const A3_BASE = 'https://a3.aliceblueonline.com/open-api/od/v1';

// ─── Credential encryption (AES-256-GCM) ────────────────────────────────────
// User broker tokens stored encrypted in DB as "{iv}:{tag}:{ciphertext}"

const getEncryptionKey = (): Buffer | null => {
  if (!env.BROKER_ENCRYPTION_KEY) return null;
  return Buffer.from(env.BROKER_ENCRYPTION_KEY, 'hex');
};

export const encryptApiKey = (plaintext: string): string => {
  const key = getEncryptionKey();
  if (!key) throw new Error('BROKER_ENCRYPTION_KEY is not configured');
  const iv     = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc    = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
};

export const decryptApiKey = (stored: string): string => {
  const key = getEncryptionKey();
  if (!key) throw new Error('BROKER_ENCRYPTION_KEY is not configured');
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Malformed encrypted key');
  const [ivHex, tagHex, encHex] = parts;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') + decipher.final('utf8');
};

export const isBrokerEncryptionConfigured = (): boolean => Boolean(env.BROKER_ENCRYPTION_KEY);

// ─── Platform token ──────────────────────────────────────────────────────────

export const getPlatformToken = (): string | null =>
  env.ALICE_ACCESS_TOKEN ?? null;

// ─── WebSocket session token (sha256(sha256(jwt))) ───────────────────────────
// Required before connecting to wss://ws1.aliceblueonline.com/NorenWS/

export const getWsSessionToken = (jwtToken: string): string => {
  const h1 = createHash('sha256').update(jwtToken, 'utf8').digest('hex');
  return createHash('sha256').update(h1, 'utf8').digest('hex');
};

// Activates a WebSocket session; must be called before opening the NorenWS socket.
export const createWsSession = async (bearerToken: string, clientId: string): Promise<void> => {
  const resp = await fetch(`${A3_BASE}/profile/createWsSess`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
    body:   JSON.stringify({ source: 'API', userId: clientId }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) throw new Error(`createWsSess HTTP ${resp.status}`);
};

// ─── Account info ───────────────────────────────────────────────────────────

export interface AliceAccountDetails {
  accountStatus: string;
  accountId:     string;
  accountName:   string;
  exchEnabled:   string;
  product:       string[];
}

export const fetchAccountDetails = async (bearerToken: string): Promise<AliceAccountDetails | null> => {
  try {
    const resp = await fetch(`${A3_BASE}/profile/`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal:  AbortSignal.timeout(8_000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { result?: AliceAccountDetails[] };
    return data?.result?.[0] ?? null;
  } catch {
    return null;
  }
};

export const fetchRmsLimits = async (bearerToken: string): Promise<unknown | null> => {
  try {
    const resp = await fetch(`${A3_BASE}/limits/`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal:  AbortSignal.timeout(8_000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { result?: unknown[] };
    return data?.result?.[0] ?? null;
  } catch {
    return null;
  }
};

// ─── Order placement ─────────────────────────────────────────────────────────
// A3 uses numeric instrumentId (= token from V2 contract master) for orders.

export interface AliceOrderRequest {
  bearerToken:     string;
  brokerUserId:    string;
  symbol:          string;   // trading_symbol (e.g. RELIANCE-EQ)
  instrumentId:    string;   // numeric token from instrument master
  exchange:        string;   // NSE, BSE, NFO, MCX, CDS
  transactionType: 'BUY' | 'SELL';
  orderType:       'MARKET' | 'LIMIT' | 'SL' | 'SLM';
  quantity:        number;
  price:           number;
  triggerPrice?:   number;
  productType?:    'INTRADAY' | 'LONGTERM' | 'MTF';
}

export interface AliceOrderResult {
  success:       boolean;
  brokerOrderId: string | null;
  error:         string | null;
}

export const placeAliceOrder = async (req: AliceOrderRequest): Promise<AliceOrderResult> => {
  try {
    const orderType =
      req.orderType === 'MARKET' ? 'MARKET' :
      req.orderType === 'SLM'    ? 'SLM'    :
      req.orderType === 'SL'     ? 'SL'     : 'LIMIT';

    const leg = {
      exchange:          req.exchange,
      instrumentId:      req.instrumentId,
      transactionType:   req.transactionType,
      quantity:          req.quantity,
      product:           req.productType ?? 'INTRADAY',
      orderComplexity:   'REGULAR',
      orderType,
      validity:          'DAY',
      price:             req.orderType === 'MARKET' ? '0' : String(req.price),
      slTriggerPrice:    req.triggerPrice ? String(req.triggerPrice) : '',
      disclosedQuantity: '',
      orderTag:          'TRAVIRT',
    };

    const resp = await fetch(`${A3_BASE}/orders/placeorder`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${req.bearerToken}`,
        'Content-Type': 'application/json',
        'User-Agent':   'TraVirt/1.0',
      },
      body:   JSON.stringify([leg]),
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      return { success: false, brokerOrderId: null, error: `HTTP ${resp.status}` };
    }

    const data = await resp.json() as { result?: { brokerOrderId?: string }[] } | { brokerOrderId?: string }[];
    const result = Array.isArray(data)
      ? data[0]
      : (data as any)?.result?.[0];

    if (result?.brokerOrderId) {
      return { success: true, brokerOrderId: String(result.brokerOrderId), error: null };
    }
    return { success: false, brokerOrderId: null, error: (result as any)?.message ?? 'Unknown broker error' };

  } catch (err) {
    return { success: false, brokerOrderId: null, error: (err as Error).message };
  }
};
