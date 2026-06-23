import { pool } from '../database/pool';

export interface PlanFeatures {
  watchlists:        number;   // -1 = unlimited
  alerts:            number;   // -1 = unlimited
  aiNews:            boolean;
  leaderboard:       boolean;
  virtualBalance:    number;
  prioritySupport:   boolean;
  propFirmReports:   boolean;
}

export interface ActivePlan {
  planName:               string;
  displayName:            string;
  priceInr:               number;
  features:               PlanFeatures;
  status:                 string;
  periodEnd:              Date | null;
  cancelAtPeriodEnd:      boolean;
  razorpaySubscriptionId: string | null;
}

export interface PlanRow {
  id:               string;
  name:             string;
  display_name:     string;
  price_inr:        number;
  features:         PlanFeatures;
  sort_order:       number;
  razorpay_plan_id: string | null;
}

const FREE_FALLBACK: ActivePlan = {
  planName:               'free',
  displayName:            'Free',
  priceInr:               0,
  features: {
    watchlists: 1, alerts: 10, aiNews: false,
    leaderboard: true, virtualBalance: 100_000,
    prioritySupport: false, propFirmReports: false,
  },
  status:                 'active',
  periodEnd:              null,
  cancelAtPeriodEnd:      false,
  razorpaySubscriptionId: null,
};

export const getActivePlan = async (userId: string): Promise<ActivePlan> => {
  const { rows } = await pool.query<{
    name: string; display_name: string; price_inr: number; features: PlanFeatures;
    status: string; current_period_end: Date | null;
    cancel_at_period_end: boolean; razorpay_subscription_id: string | null;
  }>(`
    SELECT p.name, p.display_name, p.price_inr, p.features,
           us.status, us.current_period_end, us.cancel_at_period_end, us.razorpay_subscription_id
    FROM   user_subscriptions us
    JOIN   plans p ON p.id = us.plan_id
    WHERE  us.user_id = $1
      AND  us.status IN ('active', 'trialing')
    ORDER BY us.created_at DESC
    LIMIT  1
  `, [userId]);

  if (!rows[0]) return FREE_FALLBACK;
  const r = rows[0];
  return {
    planName:               r.name,
    displayName:            r.display_name,
    priceInr:               r.price_inr,
    features:               r.features,
    status:                 r.status,
    periodEnd:              r.current_period_end,
    cancelAtPeriodEnd:      r.cancel_at_period_end,
    razorpaySubscriptionId: r.razorpay_subscription_id,
  };
};

export const listAllPlans = async (): Promise<PlanRow[]> => {
  const { rows } = await pool.query<PlanRow>(
    `SELECT id, name, display_name, price_inr, features, sort_order, razorpay_plan_id
     FROM   plans WHERE is_active = true ORDER BY sort_order`,
  );
  return rows;
};

interface UpsertParams {
  userId?:                string;
  planName?:              string;
  razorpayCustomerId?:    string;
  razorpaySubscriptionId?: string;
  razorpayPaymentId?:     string;
  status?:                string;
  currentPeriodStart?:    Date;
  currentPeriodEnd?:      Date;
  cancelAtPeriodEnd?:     boolean;
}

export const upsertSubscription = async (p: UpsertParams): Promise<void> => {
  if (!p.razorpaySubscriptionId) return;

  // Resolve userId from existing record if not supplied (webhook events)
  let userId = p.userId;
  if (!userId) {
    const { rows } = await pool.query<{ user_id: string }>(
      'SELECT user_id FROM user_subscriptions WHERE razorpay_subscription_id = $1',
      [p.razorpaySubscriptionId],
    );
    userId = rows[0]?.user_id;
    if (!userId) return;
  }

  const targetPlan = p.status === 'cancelled' || p.status === 'canceled'
    ? 'free'
    : (p.planName ?? 'pro');
  const { rows: planRows } = await pool.query<{ id: string }>(
    'SELECT id FROM plans WHERE name = $1',
    [targetPlan],
  );
  const planId = planRows[0]?.id;
  if (!planId) return;

  await pool.query(`
    INSERT INTO user_subscriptions
      (user_id, plan_id, status, razorpay_customer_id, razorpay_subscription_id, razorpay_payment_id,
       current_period_start, current_period_end, cancel_at_period_end)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (razorpay_subscription_id) DO UPDATE SET
      plan_id              = EXCLUDED.plan_id,
      status               = EXCLUDED.status,
      razorpay_customer_id = COALESCE(EXCLUDED.razorpay_customer_id, user_subscriptions.razorpay_customer_id),
      razorpay_payment_id  = COALESCE(EXCLUDED.razorpay_payment_id,  user_subscriptions.razorpay_payment_id),
      current_period_start = COALESCE(EXCLUDED.current_period_start, user_subscriptions.current_period_start),
      current_period_end   = COALESCE(EXCLUDED.current_period_end,   user_subscriptions.current_period_end),
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      updated_at           = NOW()
  `, [
    userId, planId, p.status ?? 'active',
    p.razorpayCustomerId ?? null, p.razorpaySubscriptionId,
    p.razorpayPaymentId  ?? null,
    p.currentPeriodStart ?? null, p.currentPeriodEnd ?? null,
    p.cancelAtPeriodEnd  ?? false,
  ]);
};

export const markCancelAtPeriodEnd = async (razorpaySubscriptionId: string): Promise<void> => {
  await pool.query(
    'UPDATE user_subscriptions SET cancel_at_period_end = true, updated_at = NOW() WHERE razorpay_subscription_id = $1',
    [razorpaySubscriptionId],
  );
};
