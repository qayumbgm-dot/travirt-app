// Razorpay integration — all methods return null/false when keys are absent,
// so the server runs normally in dev without real credentials.

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';

type RzpEnv = typeof env & {
  RAZORPAY_KEY_ID?:        string;
  RAZORPAY_KEY_SECRET?:    string;
  RAZORPAY_WEBHOOK_SECRET?: string;
  RAZORPAY_PLAN_ID_PRO?:   string;
  RAZORPAY_PLAN_ID_ELITE?: string;
};

const rzpEnv = env as RzpEnv;

let _rzp: Razorpay | null = null;

const getClient = (): Razorpay | null => {
  if (!rzpEnv.RAZORPAY_KEY_ID || !rzpEnv.RAZORPAY_KEY_SECRET) return null;
  if (!_rzp) {
    _rzp = new Razorpay({
      key_id:     rzpEnv.RAZORPAY_KEY_ID,
      key_secret: rzpEnv.RAZORPAY_KEY_SECRET,
    });
  }
  return _rzp;
};

// Creates a Razorpay subscription and returns the ID + public key for the frontend popup.
// userId is stored in notes so webhook events can be linked back to the user.
export const createSubscription = async (
  userId:   string,
  planName: 'pro' | 'elite',
): Promise<{ subscriptionId: string; keyId: string } | null> => {
  const rzp = getClient();
  if (!rzp || !rzpEnv.RAZORPAY_KEY_ID) return null;

  const planId = planName === 'pro'
    ? rzpEnv.RAZORPAY_PLAN_ID_PRO
    : rzpEnv.RAZORPAY_PLAN_ID_ELITE;
  if (!planId) return null;

  const sub = await rzp.subscriptions.create({
    plan_id:     planId,
    total_count: 120,  // 10-year ceiling; user cancels before
    quantity:    1,
    notes:       { userId, planName },
  } as Parameters<typeof rzp.subscriptions.create>[0]);

  return {
    subscriptionId: (sub as { id: string }).id,
    keyId:          rzpEnv.RAZORPAY_KEY_ID,
  };
};

// Verifies the HMAC-SHA256 signature returned by the Razorpay checkout handler.
// Formula: HMAC-SHA256(paymentId + "|" + subscriptionId, keySecret)
export const verifyPaymentSignature = (
  razorpayPaymentId:      string,
  razorpaySubscriptionId: string,
  razorpaySignature:      string,
): boolean => {
  if (!rzpEnv.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', rzpEnv.RAZORPAY_KEY_SECRET)
    .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
    .digest('hex');
  return expected === razorpaySignature;
};

// Verifies the HMAC-SHA256 signature on incoming Razorpay webhook payloads.
export const verifyWebhookSignature = (rawBody: string, signature: string): boolean => {
  if (!rzpEnv.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', rzpEnv.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
};

// Cancels the subscription. cancelAtCycleEnd=true keeps it active until period end.
export const cancelSubscription = async (
  razorpaySubscriptionId: string,
  cancelAtCycleEnd = true,
): Promise<void> => {
  const rzp = getClient();
  if (!rzp) return;
  await (rzp.subscriptions as unknown as {
    cancel(id: string, atCycleEnd: boolean): Promise<unknown>;
  }).cancel(razorpaySubscriptionId, cancelAtCycleEnd);
};

export const isConfigured = (): boolean =>
  Boolean(rzpEnv.RAZORPAY_KEY_ID && rzpEnv.RAZORPAY_KEY_SECRET);
