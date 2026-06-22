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
  planName:          string;
  displayName:       string;
  priceInr:          number;
  features:          PlanFeatures;
  status:            string;
  periodEnd:         Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId:  string | null;
}

export interface PlanRow {
  id:             string;
  name:           string;
  display_name:   string;
  price_inr:      number;
  features:       PlanFeatures;
  sort_order:     number;
  stripe_price_id: string | null;
}

const FREE_FALLBACK: ActivePlan = {
  planName:          'free',
  displayName:       'Free',
  priceInr:          0,
  features: {
    watchlists: 1, alerts: 10, aiNews: false,
    leaderboard: true, virtualBalance: 100_000,
    prioritySupport: false, propFirmReports: false,
  },
  status:            'active',
  periodEnd:         null,
  cancelAtPeriodEnd: false,
  stripeCustomerId:  null,
};

export const getActivePlan = async (userId: string): Promise<ActivePlan> => {
  const { rows } = await pool.query<{
    name: string; display_name: string; price_inr: number; features: PlanFeatures;
    status: string; current_period_end: Date | null;
    cancel_at_period_end: boolean; stripe_customer_id: string | null;
  }>(`
    SELECT p.name, p.display_name, p.price_inr, p.features,
           us.status, us.current_period_end, us.cancel_at_period_end, us.stripe_customer_id
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
    planName:          r.name,
    displayName:       r.display_name,
    priceInr:          r.price_inr,
    features:          r.features,
    status:            r.status,
    periodEnd:         r.current_period_end,
    cancelAtPeriodEnd: r.cancel_at_period_end,
    stripeCustomerId:  r.stripe_customer_id,
  };
};

export const listAllPlans = async (): Promise<PlanRow[]> => {
  const { rows } = await pool.query<PlanRow>(
    `SELECT id, name, display_name, price_inr, features, sort_order, stripe_price_id
     FROM   plans WHERE is_active = true ORDER BY sort_order`,
  );
  return rows;
};

interface UpsertParams {
  userId?:               string;
  planName?:             string;
  stripeCustomerId?:     string;
  stripeSubscriptionId?: string;
  status?:               string;
  currentPeriodStart?:   Date;
  currentPeriodEnd?:     Date;
  cancelAtPeriodEnd?:    boolean;
}

export const upsertSubscriptionFromStripe = async (p: UpsertParams): Promise<void> => {
  if (!p.stripeSubscriptionId) return;

  // Resolve userId from existing record if not supplied (subscription.updated events)
  let userId = p.userId;
  if (!userId) {
    const { rows } = await pool.query<{ user_id: string }>(
      'SELECT user_id FROM user_subscriptions WHERE stripe_subscription_id = $1',
      [p.stripeSubscriptionId],
    );
    userId = rows[0]?.user_id;
    if (!userId) return;
  }

  const targetPlan = p.status === 'cancelled' || p.status === 'canceled' ? 'free' : (p.planName ?? 'pro');
  const { rows: planRows } = await pool.query<{ id: string }>(
    'SELECT id FROM plans WHERE name = $1',
    [targetPlan],
  );
  const planId = planRows[0]?.id;
  if (!planId) return;

  await pool.query(`
    INSERT INTO user_subscriptions
      (user_id, plan_id, status, stripe_customer_id, stripe_subscription_id,
       current_period_start, current_period_end, cancel_at_period_end)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (stripe_subscription_id) DO UPDATE SET
      plan_id              = EXCLUDED.plan_id,
      status               = EXCLUDED.status,
      stripe_customer_id   = COALESCE(EXCLUDED.stripe_customer_id, user_subscriptions.stripe_customer_id),
      current_period_start = COALESCE(EXCLUDED.current_period_start, user_subscriptions.current_period_start),
      current_period_end   = COALESCE(EXCLUDED.current_period_end,   user_subscriptions.current_period_end),
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      updated_at           = NOW()
  `, [
    userId, planId, p.status ?? 'active',
    p.stripeCustomerId ?? null, p.stripeSubscriptionId,
    p.currentPeriodStart ?? null, p.currentPeriodEnd ?? null,
    p.cancelAtPeriodEnd ?? false,
  ]);
};
