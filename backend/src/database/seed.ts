/**
 * Seed script — creates demo accounts for beta testers.
 * Safe to re-run: uses ON CONFLICT DO NOTHING.
 *
 * Usage (from backend/):
 *   node --env-file=.env node_modules/tsx/dist/cli.mjs src/database/seed.ts
 */

import { pool } from './pool';
import bcrypt from 'bcryptjs';

const DEMO_EMAIL    = 'demo@travirt.com';
const DEMO_PASSWORD = 'Demo@1234';
const DEMO_HANDLE   = 'DEMO001';

// ─── Users ────────────────────────────────────────────────────────────────────

async function seedUsers() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (user_id, email, password_hash, display_name, role, is_verified)
     VALUES ($1, $2, $3, $4, 'subscriber_trial', TRUE)
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id`,
    [DEMO_HANDLE, DEMO_EMAIL, hash, 'Demo Trader'],
  );

  const userId = rows[0].id;
  console.log(`  ✓ demo user  ${DEMO_EMAIL}  id=${userId}`);
  return userId;
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

async function seedPortfolio(userId: string) {
  await pool.query(
    `INSERT INTO portfolio_balances (user_id, inr_balance, nxo_balance, virtual_balance)
     VALUES ($1, 10000.00, 5.0, 1000000.00)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
  console.log(`  ✓ portfolio  ₹10,000 INR · 5 NXO · ₹10,00,000 virtual`);
}

// ─── Sample positions ─────────────────────────────────────────────────────────

async function seedPositions(userId: string) {
  const positions = [
    { symbol: 'RELIANCE-EQ', exchange: 'NSE', qty: 5,  avgPrice: 1320.00 },
    { symbol: 'TCS-EQ',      exchange: 'NSE', qty: 2,  avgPrice: 3800.00 },
    { symbol: 'HDFCBANK-EQ', exchange: 'NSE', qty: 10, avgPrice:  650.00 },
  ];

  for (const p of positions) {
    await pool.query(
      `INSERT INTO positions (user_id, symbol, exchange, quantity, avg_price)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, symbol, exchange) DO NOTHING`,
      [userId, p.symbol, p.exchange, p.qty, p.avgPrice],
    );
  }
  console.log(`  ✓ positions  ${positions.length} sample trades (RELIANCE · TCS · HDFCBANK)`);
}

// ─── Sample orders ────────────────────────────────────────────────────────────

async function seedOrders(userId: string) {
  const orders = [
    { symbol: 'RELIANCE-EQ', exchange: 'NSE', qty: 5,  price: 1320, type: 'MARKET', tx: 'BUY'  },
    { symbol: 'TCS-EQ',      exchange: 'NSE', qty: 2,  price: 3800, type: 'MARKET', tx: 'BUY'  },
    { symbol: 'HDFCBANK-EQ', exchange: 'NSE', qty: 10, price:  650, type: 'LIMIT',  tx: 'BUY'  },
  ];

  for (const o of orders) {
    await pool.query(
      `INSERT INTO orders (user_id, symbol, exchange, quantity, price, order_type, transaction_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'EXECUTED')`,
      [userId, o.symbol, o.exchange, o.qty, o.price, o.type, o.tx],
    );
  }
  console.log(`  ✓ orders     ${orders.length} sample orders`);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱 Seeding database...\n');
  try {
    const userId = await seedUsers();
    await seedPortfolio(userId);
    await seedPositions(userId);
    await seedOrders(userId);
    console.log('\n✅ Seed complete.\n');
    console.log(`   Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
  } finally {
    await pool.end();
  }
}

seed().catch((err) => { console.error(err); process.exit(1); });
