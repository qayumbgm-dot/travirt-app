import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  DATABASE_URL: z.string({ required_error: 'DATABASE_URL is required' }),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string({ required_error: 'JWT_SECRET is required' }).min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_DAYS: z.string().default('30').transform(Number),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  GEMINI_API_KEY: z.string().optional(),
  ALICE_USER_ID: z.string().optional(),
  ALICE_API_KEY: z.string().optional(),
  // Public frontend URL used in email links; falls back to CORS_ORIGIN in dev
  FRONTEND_URL: z.string().optional(),
  // Stripe — optional; payments are disabled when absent
  STRIPE_SECRET_KEY:     z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO:      z.string().optional(),
  STRIPE_PRICE_ELITE:    z.string().optional(),
  // Broker credential encryption — 64-char hex (32 bytes). Generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  // Optional: broker connections are disabled when absent
  BROKER_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i).optional(),
  // SMTP — optional; emails log to console when absent
  SMTP_HOST:   z.string().optional(),
  SMTP_PORT:   z.string().default('587'),
  SMTP_SECURE: z.string().optional(),   // 'true' for port 465
  SMTP_USER:   z.string().optional(),
  SMTP_PASS:   z.string().optional(),
  SMTP_FROM:   z.string().default('noreply@travirt.in'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
