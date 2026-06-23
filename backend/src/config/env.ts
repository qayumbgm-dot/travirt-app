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
  ALICE_USER_ID:       z.string().optional(),
  ALICE_API_KEY:       z.string().optional(),
  ALICE_ACCESS_TOKEN:  z.string().optional(),
  // OAuth2 refresh token — obtained from Alice Blue Keycloak on first login.
  // When set, the server auto-refreshes the access token before it expires so
  // the live WS feed never drops due to a stale JWT.
  ALICE_REFRESH_TOKEN: z.string().optional(),
  // Keycloak token endpoint. Default: Alice Blue A3 realm.
  ALICE_TOKEN_URL: z.string().optional(),
  // Keycloak client_id used in the refresh grant. Default: 'web'.
  ALICE_CLIENT_ID: z.string().optional(),
  // Public frontend URL used in email links; falls back to CORS_ORIGIN in dev
  FRONTEND_URL: z.string().optional(),
  // Razorpay — optional; payments are disabled when absent
  RAZORPAY_KEY_ID:        z.string().optional(),
  RAZORPAY_KEY_SECRET:    z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_ID_PRO:   z.string().optional(),
  RAZORPAY_PLAN_ID_ELITE: z.string().optional(),
  // Broker credential encryption — 64-char hex (32 bytes). Generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  // Optional: broker connections are disabled when absent
  BROKER_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i).optional(),
  // Brevo HTTP email API — preferred in production (Render blocks outbound SMTP).
  // When BREVO_API_KEY is set, email sends over HTTPS via Brevo instead of SMTP.
  SENTRY_DSN:         z.string().url().optional(),
  BREVO_API_KEY:      z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().optional(),  // a verified Brevo sender; falls back to SMTP_FROM
  BREVO_SENDER_NAME:  z.string().default('TraVirt'),
  // SMTP — optional fallback (works locally; blocked on Render free tier).
  // Emails log to console when neither Brevo nor SMTP is configured.
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
