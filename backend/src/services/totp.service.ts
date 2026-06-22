// RFC 6238 TOTP — pure Node.js crypto, no external dependencies.
import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const base32Encode = (buf: Buffer): string => {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 0x1f]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 0x1f];
  return out;
};

const base32Decode = (encoded: string): Buffer => {
  const clean = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
};

const hotp = (secret: Buffer, counter: bigint): string => {
  const cb = Buffer.alloc(8);
  cb.writeBigUInt64BE(counter);
  const h = crypto.createHmac('sha1', secret).update(cb).digest();
  const off = h[19] & 0x0f;
  const code = ((h[off] & 0x7f) << 24 | h[off + 1] << 16 | h[off + 2] << 8 | h[off + 3]) % 1_000_000;
  return code.toString().padStart(6, '0');
};

export const generateSecret = (): string => base32Encode(crypto.randomBytes(20));

export const generateOtpAuthUri = (secret: string, userId: string, issuer = 'TraVirt'): string =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userId)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

export const verifyTotp = (base32Secret: string, token: string): boolean => {
  if (!/^\d{6}$/.test(token)) return false;
  const secret  = base32Decode(base32Secret);
  const counter = BigInt(Math.floor(Date.now() / 30_000));
  // Accept ±1 window for clock skew
  for (let i = -1n; i <= 1n; i++) {
    if (hotp(secret, counter + i) === token) return true;
  }
  return false;
};

// 8 recovery codes formatted XXXXX-XXXXX (10 hex chars split in half)
export const generateRecoveryCodes = (): string[] =>
  Array.from({ length: 8 }, () => {
    const hex = crypto.randomBytes(5).toString('hex').toUpperCase();
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
