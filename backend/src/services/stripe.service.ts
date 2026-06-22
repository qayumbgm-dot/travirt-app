// Stripe integration — all methods return null when STRIPE_SECRET_KEY is not set,
// so the server runs normally in dev without real credentials.

import Stripe from 'stripe';
import { env } from '../config/env';

type StripeEnv = typeof env & {
  STRIPE_SECRET_KEY?:    string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO?:     string;
  STRIPE_PRICE_ELITE?:   string;
};

const stripeEnv = env as StripeEnv;

let _stripe: Stripe | null = null;

const getClient = (): Stripe | null => {
  if (!stripeEnv.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(stripeEnv.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
  }
  return _stripe;
};

export const createCheckoutSession = async (
  userId:     string,
  email:      string,
  planName:   'pro' | 'elite',
  successUrl: string,
  cancelUrl:  string,
): Promise<string | null> => {
  const stripe  = getClient();
  if (!stripe)  return null;

  const priceId = planName === 'pro' ? stripeEnv.STRIPE_PRICE_PRO : stripeEnv.STRIPE_PRICE_ELITE;
  if (!priceId) return null;

  const session = await stripe.checkout.sessions.create({
    mode:                 'subscription',
    payment_method_types: ['card'],
    customer_email:       email,
    metadata:             { userId, planName },
    line_items:           [{ price: priceId, quantity: 1 }],
    success_url:          successUrl,
    cancel_url:           cancelUrl,
    subscription_data:    { metadata: { userId, planName } },
    allow_promotion_codes: true,
  });

  return session.url;
};

export const constructWebhookEvent = (
  rawBody:   Buffer,
  signature: string,
): Stripe.Event | null => {
  const stripe = getClient();
  if (!stripe || !stripeEnv.STRIPE_WEBHOOK_SECRET) return null;

  try {
    return stripe.webhooks.constructEvent(rawBody, signature, stripeEnv.STRIPE_WEBHOOK_SECRET);
  } catch {
    return null;
  }
};

export const createPortalSession = async (
  stripeCustomerId: string,
  returnUrl:        string,
): Promise<string | null> => {
  const stripe = getClient();
  if (!stripe) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer:   stripeCustomerId,
    return_url: returnUrl,
  });
  return session.url;
};

export const cancelSubscription = async (stripeSubscriptionId: string): Promise<void> => {
  const stripe = getClient();
  if (!stripe) return;
  await stripe.subscriptions.cancel(stripeSubscriptionId);
};

export const isConfigured = (): boolean => Boolean(stripeEnv.STRIPE_SECRET_KEY);
