// Alice Blue ANT API — order placement and account data.
// Auth: Keycloak JWT Bearer token (ALICE_ACCESS_TOKEN in env).
// Confirmed working endpoints (2026-06-22):
//   GET  /api/customer/accountDetails   — profile
//   GET  /api/limits/getRmsLimits       — margin / funds
//   GET  /api/placeOrder/fetchOrderBook — order history
//   GET  /api/placeOrder/fetchTradeBook — trade history
//   POST /api/placeOrder/executePlaceOrder — place order

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '../config/env';

const ALICE_API_BASE = 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api';

// ─── Credential encryption (AES-256-GCM) ────────────────────────────────────
// User broker API keys are stored encrypted in the DB as "{iv}:{tag}:{ciphertext}"

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

// ─── Platform session token ──────────────────────────────────────────────────
// The platform's own Alice Blue JWT (ALICE_ACCESS_TOKEN) is used for
// market data and admin-level queries. Individual user tokens are stored
// in broker_connections (encrypted) and passed in per-request.

export const getPlatformToken = (): string | null =>
  (env as any).ALICE_ACCESS_TOKEN ?? null;

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
    const resp = await fetch(`${ALICE_API_BASE}/customer/accountDetails`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal:  AbortSignal.timeout(8_000),
    });
    if (!resp.ok) return null;
    return await resp.json() as AliceAccountDetails;
  } catch {
    return null;
  }
};

// ─── Funds / margin ─────────────────────────────────────────────────────────

export const fetchRmsLimits = async (bearerToken: string): Promise<unknown | null> => {
  try {
    const resp = await fetch(`${ALICE_API_BASE}/limits/getRmsLimits`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal:  AbortSignal.timeout(8_000),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
};

// ─── Order placement types ───────────────────────────────────────────────────

export interface AliceOrderRequest {
  bearerToken:     string;
  brokerUserId:    string;
  symbol:          string;
  exchange:        string;
  transactionType: 'BUY' | 'SELL';
  orderType:       'MARKET' | 'LIMIT' | 'SL' | 'SLM';
  quantity:        number;
  price:           number;
  triggerPrice?:   number;
  productType?:    string;
}

export interface AliceOrderResult {
  success:       boolean;
  brokerOrderId: string | null;
  error:         string | null;
}

interface AliceApiResponse {
  stat:    string;
  NOrdNo?: string;
  emsg?:   string;
}

// ─── Place order ─────────────────────────────────────────────────────────────

export const placeAliceOrder = async (req: AliceOrderRequest): Promise<AliceOrderResult> => {
  try {
    const priceType = req.orderType === 'MARKET' ? 'MARKET'
                    : req.orderType === 'SLM'    ? 'SL-M'
                    : req.orderType === 'SL'     ? 'SL'
                    : 'LIMIT';

    const body = {
      userId:          req.brokerUserId,
      orderType:       'REGULAR',
      instrumentToken: req.symbol,
      exchange:        req.exchange,
      transactionType: req.transactionType,
      productType:     req.productType ?? 'MIS',
      priceType,
      price:           req.orderType === 'MARKET' ? 0 : req.price,
      qty:             req.quantity,
      disclosedQty:    0,
      triggerPrice:    req.triggerPrice ?? 0,
      orderTag:        'TRAVIRT',
    };

    const resp = await fetch(`${ALICE_API_BASE}/placeOrder/executePlaceOrder`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${req.bearerToken}`,
        'Content-Type': 'application/json',
        'User-Agent':   'TraVirt/1.0',
      },
      body:   JSON.stringify([body]),
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      return { success: false, brokerOrderId: null, error: `HTTP ${resp.status}` };
    }

    const data = await resp.json() as AliceApiResponse[] | AliceApiResponse;
    const result = Array.isArray(data) ? data[0] : data;

    if (result?.stat === 'Ok' && result.NOrdNo) {
      return { success: true, brokerOrderId: result.NOrdNo, error: null };
    }
    return { success: false, brokerOrderId: null, error: result?.emsg ?? 'Unknown broker error' };

  } catch (err) {
    return { success: false, brokerOrderId: null, error: (err as Error).message };
  }
};
