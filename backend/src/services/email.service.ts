import { env } from '../config/env';

interface EmailOptions {
  to:      string;
  subject: string;
  html:    string;
}

const appOrigin = () => env.FRONTEND_URL ?? env.CORS_ORIGIN;

// ─── Transport ────────────────────────────────────────────────────────────────

// Shared SMTP transport settings. Timeouts are critical: without them a blocked
// or stalled outbound connection hangs the request forever instead of erroring.
const smtpConfig = () => ({
  host:              env.SMTP_HOST,
  port:              parseInt(env.SMTP_PORT),
  secure:            env.SMTP_SECURE === 'true',
  auth:              { user: env.SMTP_USER, pass: env.SMTP_PASS },
  connectionTimeout: 10_000,  // TCP connect
  greetingTimeout:   10_000,  // wait for SMTP greeting
  socketTimeout:     15_000,  // inactivity on the socket
});

const brevoSender = () => ({
  name:  env.BREVO_SENDER_NAME,
  email: env.BREVO_SENDER_EMAIL ?? env.SMTP_FROM,
});

// Send via Brevo's transactional HTTP API (HTTPS:443 — not blocked like SMTP).
const sendViaBrevo = async (opts: EmailOptions): Promise<void> => {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: {
      'api-key':      env.BREVO_API_KEY as string,
      'content-type': 'application/json',
      accept:         'application/json',
    },
    body: JSON.stringify({
      sender:      brevoSender(),
      to:          [{ email: opts.to }],
      subject:     opts.subject,
      htmlContent: opts.html,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Brevo API ${res.status}: ${detail.slice(0, 300)}`);
  }
};

// Lazy singleton — created once on first use so startup is not blocked.
let _smtpTransport: { sendMail: (msg: unknown) => Promise<unknown> } | null = null;

const getSmtpTransport = () => {
  if (!_smtpTransport) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require('nodemailer') as {
      createTransport: (cfg: unknown) => { sendMail: (msg: unknown) => Promise<unknown> };
    };
    _smtpTransport = nodemailer.createTransport(smtpConfig());
  }
  return _smtpTransport;
};

const sendViaSMTP = async (opts: EmailOptions): Promise<void> => {
  await getSmtpTransport().sendMail({
    from:    `"TraVirt" <${env.SMTP_FROM}>`,
    to:      opts.to,
    subject: opts.subject,
    html:    opts.html,
  });
};

// Diagnostic: reports the active transport's config (never leaks secrets) and
// runs a live check so misconfiguration surfaces clearly.
export const verifyEmailTransport = async (): Promise<{
  transport: 'brevo' | 'smtp' | 'none';
  configured: boolean;
  config: Record<string, string | boolean>;
  verified: boolean;
  error?: string;
}> => {
  // ── Brevo (preferred) ──────────────────────────────────────────────────────
  if (env.BREVO_API_KEY) {
    const config = {
      BREVO_API_KEY:      `set (${env.BREVO_API_KEY.length} chars)`,
      BREVO_SENDER_EMAIL: env.BREVO_SENDER_EMAIL ?? env.SMTP_FROM,
      BREVO_SENDER_NAME:  env.BREVO_SENDER_NAME,
    };
    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': env.BREVO_API_KEY, accept: 'application/json' },
        signal:  AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        return { transport: 'brevo', configured: true, config, verified: false,
          error: `Brevo API ${res.status}: ${detail.slice(0, 200)}` };
      }
      return { transport: 'brevo', configured: true, config, verified: true };
    } catch (err) {
      return { transport: 'brevo', configured: true, config, verified: false, error: (err as Error).message };
    }
  }

  // ── SMTP (fallback) ────────────────────────────────────────────────────────
  const config = {
    SMTP_HOST:   env.SMTP_HOST ?? '(not set)',
    SMTP_PORT:   env.SMTP_PORT,
    SMTP_SECURE: env.SMTP_SECURE ?? '(not set)',
    SMTP_USER:   env.SMTP_USER ?? '(not set)',
    SMTP_PASS:   env.SMTP_PASS ? `set (${env.SMTP_PASS.length} chars)` : '(not set)',
    SMTP_FROM:   env.SMTP_FROM,
  };
  if (!env.SMTP_HOST) {
    return { transport: 'none', configured: false, config, verified: false,
      error: 'No email transport configured — emails are logged only' };
  }
  try {
    await (getSmtpTransport() as unknown as { verify: () => Promise<true> }).verify();
    return { transport: 'smtp', configured: true, config, verified: true };
  } catch (err) {
    return { transport: 'smtp', configured: true, config, verified: false, error: (err as Error).message };
  }
};

export const sendEmail = async (opts: EmailOptions): Promise<void> => {
  // Prefer Brevo HTTP API (works on Render); fall back to SMTP; else log only.
  if (!env.BREVO_API_KEY && !env.SMTP_HOST) {
    console.log(`[email] Would send to ${opts.to}: ${opts.subject}`);
    return;
  }
  try {
    if (env.BREVO_API_KEY) {
      await sendViaBrevo(opts);
    } else {
      await sendViaSMTP(opts);
    }
  } catch (err) {
    console.error('[email] Send failed:', err);
    // Non-fatal — never let email failure crash a request
  }
};

// ─── Templates ────────────────────────────────────────────────────────────────

export const sendWelcomeEmail = (to: string, userId: string): Promise<void> =>
  sendEmail({
    to,
    subject: 'Welcome to TraVirt — Your Virtual Trading Journey Begins',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#6366f1">Welcome to TraVirt, ${userId}!</h2>
        <p>Your account has been created. Start trading with virtual money — no real capital at risk.</p>
        <ul>
          <li>Trade NSE/BSE equities and F&amp;O with ₹0 risk</li>
          <li>Set GTT orders and price alerts</li>
          <li>Compete on the leaderboard with real P&amp;L tracking</li>
        </ul>
        <a href="${appOrigin()}"
           style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px">
          Start Trading
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">TraVirt · Virtual Trading Platform</p>
      </div>
    `,
  });

export const sendEmailVerificationEmail = (to: string, verificationLink: string): Promise<void> =>
  sendEmail({
    to,
    subject: 'TraVirt — Verify Your Email Address',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#6366f1">Verify Your Email</h2>
        <p>Thanks for signing up! Click the button below to verify your email address.</p>
        <p>This link expires in <strong>24 hours</strong>.</p>
        <a href="${verificationLink}"
           style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px">
          Verify Email
        </a>
        <p style="margin-top:16px;font-size:13px;color:#555">
          If you didn't create a TraVirt account, you can safely ignore this email.
        </p>
        <p style="color:#888;font-size:12px;margin-top:24px">TraVirt · Virtual Trading Platform</p>
      </div>
    `,
  });

export const sendSupportAckEmail = (to: string, ticketId: string, subject: string): Promise<void> =>
  sendEmail({
    to,
    subject: `[Ticket #${ticketId.slice(0, 8)}] We received your request`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#6366f1">Support Request Received</h2>
        <p>We received your request: <strong>${subject}</strong></p>
        <p>Our team will respond within 24–48 hours.</p>
        <p>Ticket ID: <code>${ticketId}</code></p>
        <p style="color:#888;font-size:12px;margin-top:24px">TraVirt Support</p>
      </div>
    `,
  });

interface TradeEmailParams {
  symbol:     string;
  exchange:   string;
  quantity:   number;
  price:      number;
  type:       'BUY' | 'SELL';
  newBalance: number;
}

export const sendTradeConfirmationEmail = (to: string, trade: TradeEmailParams): Promise<void> => {
  const action = trade.type === 'BUY' ? 'Bought' : 'Sold';
  const total  = (trade.quantity * trade.price).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  const bal    = trade.newBalance.toLocaleString('en-IN',               { style: 'currency', currency: 'INR' });
  return sendEmail({
    to,
    subject: `TraVirt — ${action} ${trade.quantity} × ${trade.symbol}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#6366f1">Order Executed</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px;color:#666">Action</td>   <td style="padding:6px;font-weight:600">${action}</td></tr>
          <tr><td style="padding:6px;color:#666">Symbol</td>   <td style="padding:6px">${trade.symbol} (${trade.exchange})</td></tr>
          <tr><td style="padding:6px;color:#666">Quantity</td> <td style="padding:6px">${trade.quantity}</td></tr>
          <tr><td style="padding:6px;color:#666">Price</td>    <td style="padding:6px">₹${trade.price.toLocaleString('en-IN')}</td></tr>
          <tr><td style="padding:6px;color:#666">Total</td>    <td style="padding:6px">${total}</td></tr>
          <tr style="background:#f9fafb">
            <td style="padding:6px;color:#666">Balance</td>
            <td style="padding:6px;font-weight:600">${bal}</td>
          </tr>
        </table>
        <p style="color:#888;font-size:12px;margin-top:24px">This is a virtual trade — no real money was involved. TraVirt</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = (to: string, resetLink: string): Promise<void> =>
  sendEmail({
    to,
    subject: 'TraVirt — Reset Your Password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#6366f1">Reset Your Password</h2>
        <p>We received a request to reset the password for your TraVirt account.</p>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetLink}"
           style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px">
          Reset Password
        </a>
        <p style="margin-top:16px;font-size:13px;color:#555">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
        <p style="color:#888;font-size:12px;margin-top:24px">TraVirt · Virtual Trading Platform</p>
      </div>
    `,
  });

export const sendAccountErasedEmail = (to: string): Promise<void> =>
  sendEmail({
    to,
    subject: 'Your TraVirt account has been deleted',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#6366f1">Account Deleted</h2>
        <p>As requested, your TraVirt account and all associated data have been permanently deleted.</p>
        <p>This includes your portfolio, orders, watchlists, and personal information.</p>
        <p>If you did not request this deletion, please contact us immediately at
           <a href="mailto:support@travirt.in">support@travirt.in</a>.
        </p>
        <p style="color:#888;font-size:12px;margin-top:24px">TraVirt · Virtual Trading Platform</p>
      </div>
    `,
  });

export const sendAlertTriggeredEmail = (
  to: string,
  symbol: string,
  currentPrice: number,
  targetPrice: number,
  direction: 'above' | 'below',
): Promise<void> =>
  sendEmail({
    to,
    subject: `TraVirt — Price Alert: ${symbol} hit ₹${targetPrice.toLocaleString('en-IN')}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#6366f1">Price Alert Triggered</h2>
        <p><strong>${symbol}</strong> is now trading at
           <strong>₹${currentPrice.toLocaleString('en-IN')}</strong>,
           which is ${direction} your target of ₹${targetPrice.toLocaleString('en-IN')}.
        </p>
        <a href="${appOrigin()}"
           style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px">
          View in TraVirt
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px">TraVirt · Virtual Trading Platform</p>
      </div>
    `,
  });
