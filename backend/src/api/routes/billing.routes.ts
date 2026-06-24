import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as razorpayService from '../../services/razorpay.service';
import {
  getActivePlan,
  listAllPlans,
  upsertSubscription,
  markCancelAtPeriodEnd,
} from '../../services/subscription.service';
import { pool } from '../../database/pool';

const checkoutSchema = z.object({ planName: z.enum(['pro', 'elite']) });
const verifySchema   = z.object({
  razorpayPaymentId:      z.string().min(1),
  razorpaySubscriptionId: z.string().min(1),
  razorpaySignature:      z.string().min(1),
  planName:               z.enum(['pro', 'elite']),
});

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: {
      entity: {
        id: string;
        customer_id?: string;
        status: string;
        current_start?: number;
        current_end?: number;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity: { id: string };
    };
  };
}

export const billingRoutes = async (fastify: FastifyInstance) => {
  // Expose raw body for Razorpay webhook signature verification.
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      (_req as FastifyRequest & { rawBody: Buffer }).rawBody = body as Buffer;
      try {
        done(null, JSON.parse((body as Buffer).toString()));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // GET /billing/plans — public plan catalogue
  fastify.get('/plans', async (_req, reply) => {
    const plans = await listAllPlans();
    return reply.send({ plans });
  });

  // GET /billing/status — authenticated user's current plan
  fastify.get('/status', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const plan = await getActivePlan(req.user.sub);
    return reply.send({ ...plan, razorpayConfigured: razorpayService.isConfigured() });
  });

  // POST /billing/checkout — create Razorpay subscription; frontend opens popup with the ID
  fastify.post(
    '/checkout',
    { preHandler: [fastify.authenticate], config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'planName must be "pro" or "elite"' });
      }
      const result = await razorpayService.createSubscription(
        req.user.sub, parsed.data.planName,
      );
      if (!result) {
        return reply.code(503).send({ error: 'Razorpay is not configured on this server' });
      }
      return reply.send({ ...result, planName: parsed.data.planName });
    },
  );

  // POST /billing/verify — verify payment signature from Razorpay checkout callback, activate plan
  fastify.post(
    '/verify',
    { preHandler: [fastify.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = verifySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid verification payload' });
      }
      const { razorpayPaymentId, razorpaySubscriptionId, razorpaySignature, planName } = parsed.data;

      const valid = razorpayService.verifyPaymentSignature(
        razorpayPaymentId, razorpaySubscriptionId, razorpaySignature,
      );
      if (!valid) {
        return reply.code(400).send({ error: 'Invalid payment signature' });
      }

      await upsertSubscription({
        userId:                 req.user.sub,
        planName,
        razorpaySubscriptionId,
        razorpayPaymentId,
        status:                 'active',
      });

      return reply.send({ success: true });
    },
  );

  // POST /billing/subscribe — mobile alias for /billing/checkout
  fastify.post(
    '/subscribe',
    { preHandler: [fastify.authenticate], config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'planName must be "pro" or "elite"' });
      }
      const result = await razorpayService.createSubscription(req.user.sub, parsed.data.planName);
      if (!result) {
        return reply.code(503).send({ error: 'Razorpay is not configured on this server' });
      }
      return reply.send({ ...result, planName: parsed.data.planName });
    },
  );

  // GET /billing/history — authenticated user's subscription history
  fastify.get(
    '/history',
    { preHandler: [fastify.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { rows } = await pool.query<{
        plan_name: string; display_name: string; price_inr: number;
        status: string; created_at: Date; current_period_end: Date | null;
        razorpay_subscription_id: string | null; razorpay_payment_id: string | null;
      }>(`
        SELECT p.name AS plan_name, p.display_name, p.price_inr,
               us.status, us.created_at, us.current_period_end,
               us.razorpay_subscription_id, us.razorpay_payment_id
        FROM   user_subscriptions us
        JOIN   plans p ON p.id = us.plan_id
        WHERE  us.user_id = $1
        ORDER BY us.created_at DESC
        LIMIT  20
      `, [req.user.sub]);

      return reply.send({
        history: rows.map((r) => ({
          planName:               r.plan_name,
          displayName:            r.display_name,
          priceInr:               r.price_inr,
          status:                 r.status,
          createdAt:              r.created_at,
          periodEnd:              r.current_period_end,
          razorpaySubscriptionId: r.razorpay_subscription_id,
          razorpayPaymentId:      r.razorpay_payment_id,
        })),
      });
    },
  );

  // POST /billing/cancel — cancel the authenticated user's active subscription at cycle end
  fastify.post(
    '/cancel',
    { preHandler: [fastify.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const plan = await getActivePlan(req.user.sub);
      if (!plan.razorpaySubscriptionId) {
        return reply.code(400).send({ error: 'No active paid subscription found' });
      }
      await razorpayService.cancelSubscription(plan.razorpaySubscriptionId, true);
      await markCancelAtPeriodEnd(plan.razorpaySubscriptionId);
      return reply.send({ success: true });
    },
  );

  // POST /billing/webhook — Razorpay webhook (unauthenticated, signature-verified)
  fastify.post('/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
    const sig = req.headers['x-razorpay-signature'] as string | undefined;
    if (!sig) return reply.code(400).send({ error: 'Missing x-razorpay-signature header' });

    const rawBody = (req as FastifyRequest & { rawBody?: Buffer }).rawBody;
    if (!rawBody) return reply.code(400).send({ error: 'Missing raw body' });

    const valid = razorpayService.verifyWebhookSignature(rawBody.toString(), sig);
    if (!valid) return reply.code(400).send({ error: 'Invalid webhook signature' });

    try {
      await handleWebhookEvent(req.body as RazorpayWebhookPayload);
    } catch (err) {
      req.log.error({ err, event: (req.body as RazorpayWebhookPayload)?.event }, '[billing/webhook] Handler error');
    }

    return reply.code(200).send({ received: true });
  });
};

const handleWebhookEvent = async (event: RazorpayWebhookPayload): Promise<void> => {
  const sub = event.payload.subscription?.entity;
  if (!sub) return;

  const paymentId = event.payload.payment?.entity.id;

  switch (event.event) {
    case 'subscription.activated': {
      await upsertSubscription({
        userId:                 sub.notes?.userId,
        planName:               sub.notes?.planName ?? 'pro',
        razorpayCustomerId:     sub.customer_id,
        razorpaySubscriptionId: sub.id,
        razorpayPaymentId:      paymentId,
        status:                 'active',
        currentPeriodStart:     sub.current_start ? new Date(sub.current_start * 1000) : undefined,
        currentPeriodEnd:       sub.current_end   ? new Date(sub.current_end   * 1000) : undefined,
      });
      break;
    }
    case 'subscription.charged': {
      await upsertSubscription({
        razorpayCustomerId:     sub.customer_id,
        razorpaySubscriptionId: sub.id,
        razorpayPaymentId:      paymentId,
        status:                 'active',
        cancelAtPeriodEnd:      false,
        currentPeriodStart:     sub.current_start ? new Date(sub.current_start * 1000) : undefined,
        currentPeriodEnd:       sub.current_end   ? new Date(sub.current_end   * 1000) : undefined,
      });
      break;
    }
    case 'subscription.halted': {
      await upsertSubscription({ razorpaySubscriptionId: sub.id, status: 'halted' });
      break;
    }
    case 'subscription.cancelled': {
      await upsertSubscription({ razorpaySubscriptionId: sub.id, status: 'cancelled' });
      break;
    }
  }
};
