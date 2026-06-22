// Alice Blue ANT API — order placement only.
// Market data uses the shared WebSocket in market.service.ts (not this file).

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '../config/env';

// ─── Credential encryption (AES-256-GCM) ─────────────────────────────────────
// Stored as "{iv_hex}:{auth_tag_hex}:{ciphertext_hex}"

const getEncryptionKey = (): Buffer | null => {
  if (!env.BROKER_ENCRYPTION_KEY) return null;
  return Buffer.from(env.BROKER_ENCRYPTION_KEY, 'hex');
};

export const encryptApiKey = (plaintext: string): string => {
  const key = getEncryptionKey();
  if (!key) throw new Error('BROKER_ENCRYPTION_KEY is not configured');
  const iv     = randomBytes(12); // 96-bit IV for GCM
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

// ─── Order placement types ────────────────────────────────────────────────────

export interface AliceOrderRequest {
  brokerUserId:    string;
  apiKey:          string;         // decrypted bearer token
  symbol:          string;         // e.g. "RELIANCE"
  exchange:        string;         // "NSE" | "BSE" | "NFO" | "MCX"
  transactionType: 'BUY' | 'SELL';
  orderType:       'MARKET' | 'LIMIT' | 'SL' | 'SLM';
  quantity:        number;
  price:           number;         // 0 for MARKET orders
  triggerPrice?:   number;
  productType?:    string;         // "MIS" (intraday) | "CNC" (delivery) | "NRML"
}

export interface AliceOrderResult {
  success:       boolean;
  brokerOrderId: string | null;
  error:         string | null;
}

// ─── Alice Blue ANT API endpoint ──────────────────────────────────────────────

const ALICE_API_BASE = 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api';

interface AliceApiResponse {
  stat:   string;        // "Ok" | "Not_Ok"
  NOrdNo?: string;       // order number on success
  emsg?:  string;        // error message on failure
}

export const placeAliceOrder = async (req: AliceOrderRequest): Promise<AliceOrderResult> => {
  try {
    const priceType = req.orderType === 'MARKET' ? 'MARKET'
                    : req.orderType === 'SLM'    ? 'SL-M'
                    : req.orderType === 'SL'     ? 'SL'
                    : 'LIMIT';

    const body = {
      userId:          req.brokerUserId,
      orderType:       'REGULAR',
      instrumentToken: req.symbol,     // Alice Blue accepts symbol name for most instruments
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
        'Authorization': `Bearer ${req.apiKey}`,
        'Content-Type':  'application/json',
        'User-Agent':    'TraVirt/1.0',
      },
      body:   JSON.stringify([body]),   // ANT API expects an array
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
