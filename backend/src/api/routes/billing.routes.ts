import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type Stripe from 'stripe';

const checkoutSchema = z.object({ planName: z.enum(['pro', 'elite']) });
import * as stripeService from '../../services/stripe.service';
import {
  getActivePlan,
  listAllPlans,
  upsertSubscriptionFromStripe,
} from '../../services/subscription.service';
import { env } from '../../config/env';

type StripeEnv = typeof env & { CORS_ORIGIN?: string };

export const billingRoutes = async (fastify: FastifyInstance) => {
  // Override the JSON parser for this plugin scope to also expose the raw buffer.
  // Stripe webhook verification requires the exact raw request body.
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
    return reply.send({ ...plan, stripeConfigured: stripeService.isConfigured() });
  });

  // POST /billing/checkout — create Stripe Checkout session for a plan upgrade
  fastify.post(
    '/checkout',
    { preHandler: [fastify.authenticate], config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'planName must be "pro" or "elite"' });
      }
      const { planName } = parsed.data;

      const origin     = (env as StripeEnv).CORS_ORIGIN ?? 'http://localhost:5173';
      const successUrl = `${origin}/#billing?success=1`;
      const cancelUrl  = `${origin}/#billing?cancelled=1`;

      const url = await stripeService.createCheckoutSession(
        req.user.sub, req.user.email, planName, successUrl, cancelUrl,
      );
      if (!url) return reply.code(503).send({ error: 'Stripe is not configured on this server' });
      return reply.send({ url });
    },
  );

  // GET /billing/portal — Stripe Customer Portal link (manage/cancel subscription)
  fastify.get(
    '/portal',
    { preHandler: [fastify.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const plan = await getActivePlan(req.user.sub);
      if (!plan.stripeCustomerId) {
        return reply.code(400).send({ error: 'No paid subscription found' });
      }
      const origin = (env as StripeEnv).CORS_ORIGIN ?? 'http://localhost:5173';
      const url    = await stripeService.createPortalSession(plan.stripeCustomerId, `${origin}/#billing`);
      if (!url) return reply.code(503).send({ error: 'Stripe is not configured on this server' });
      return reply.send({ url });
    },
  );

  // POST /billing/webhook — Stripe webhook (unauthenticated, signature-verified)
  fastify.post('/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
    const sig = req.headers['stripe-signature'] as string | undefined;
    if (!sig) return reply.code(400).send({ error: 'Missing stripe-signature header' });

    const rawBody = (req as FastifyRequest & { rawBody?: Buffer }).rawBody;
    if (!rawBody) return reply.code(400).send({ error: 'Missing raw body' });

    const event = stripeService.constructWebhookEvent(rawBody, sig);
    if (!event)  return reply.code(400).send({ error: 'Invalid webhook signature' });

    try {
      await handleWebhookEvent(event);
    } catch (err) {
      req.log.error({ err, type: event.type }, '[billing/webhook] Handler error');
    }

    return reply.code(200).send({ received: true });
  });
};

const handleWebhookEvent = async (event: Stripe.Event): Promise<void> => {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as {
        mode?: string;
        subscription?: string;
        customer?: string;
        metadata?: Record<string, string>;
      };
      if (session.mode !== 'subscription' || !session.subscription) break;
      await upsertSubscriptionFromStripe({
        userId:               session.metadata?.userId,
        planName:             session.metadata?.planName ?? 'pro',
        stripeCustomerId:     session.customer ?? undefined,
        stripeSubscriptionId: session.subscription,
        status:               'active',
      });
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as {
        id: string; status: string; customer: string;
        current_period_start: number; current_period_end: number;
        cancel_at_period_end: boolean;
        metadata?: Record<string, string>;
      };
      await upsertSubscriptionFromStripe({
        planName:             sub.metadata?.planName,
        stripeCustomerId:     sub.customer,
        stripeSubscriptionId: sub.id,
        status:               sub.status,
        currentPeriodStart:   new Date(sub.current_period_start * 1000),
        currentPeriodEnd:     new Date(sub.current_period_end   * 1000),
        cancelAtPeriodEnd:    sub.cancel_at_period_end,
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as { id: string; customer: string };
      await upsertSubscriptionFromStripe({
        stripeCustomerId:     sub.customer,
        stripeSubscriptionId: sub.id,
        status:               'cancelled',
      });
      break;
    }
  }
};
