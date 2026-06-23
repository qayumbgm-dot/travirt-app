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

// ─── Token refresh (Keycloak OAuth2) ────────────────────────────────────────
// Alice Blue A3 uses Keycloak for auth. The refresh token can be exchanged for
// a new access token without re-authenticating (no TOTP required).

const DEFAULT_TOKEN_URL = 'https://a3.aliceblueonline.com/realms/alice/protocol/openid-connect/token';
const DEFAULT_CLIENT_ID = 'web';

/** Reads the `exp` (epoch seconds) from a JWT payload without verifying the signature. */
export const decodeJwtExp = (token: string): number | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url → base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as Record<string, unknown>;
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
};

export interface TokenSet {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number;
}

/** Exchange a Keycloak refresh token for a new access + refresh token pair. */
export const refreshAliceToken = async (
  refreshToken: string,
  tokenUrl  = DEFAULT_TOKEN_URL,
  clientId  = DEFAULT_CLIENT_ID,
): Promise<TokenSet> => {
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
    client_id:     clientId,
  });

  const resp = await fetch(tokenUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
    signal:  AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`Keycloak token refresh HTTP ${resp.status}: ${detail.slice(0, 200)}`);
  }

  const data = await resp.json() as {
    access_token:   string;
    refresh_token?: string;
    expires_in?:    number;
  };

  if (!data.access_token) throw new Error('Keycloak returned no access_token');

  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token ?? refreshToken, // rotate if provided
    expiresIn:    data.expires_in ?? 3600,
  };
};

// ─── Auth code exchange (ANT platform OAuth callback) ────────────────────────
// When a user completes Alice Blue ANT login, the browser is redirected back with
// ?authCode=...&userId=...&appcode=...
// Exchange formula: sha256(userId + apiKey + authCode) → POST sessionauth → susertoken

export const exchangeAuthCode = async (
  userId:   string,
  apiKey:   string,
  authCode: string,
  appCode:  string,
): Promise<string> => {
  const userData = createHash('sha256')
    .update(userId + apiKey + authCode, 'utf8')
    .digest('hex');

  const resp = await fetch('https://a3.aliceblueonline.com/open-api/v2/sessionauth', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AppID':       appCode,
    },
    body:   JSON.stringify({ userId, userData }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`Alice Blue session auth HTTP ${resp.status}: ${detail.slice(0, 200)}`);
  }

  const data = await resp.json() as {
    data?:        { susertoken?: string };
    susertoken?:  string;
    status?:      string;
    emsg?:        string;
  };

  const token = data?.data?.susertoken ?? data?.susertoken;
  if (!token) throw new Error(data?.emsg ?? 'No susertoken in session auth response');
  return token;
};

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
