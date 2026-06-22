import { buildApp } from './app';
import { env } from './config/env';
import { pool } from './database/pool';
import { runMigrations } from './database/migrate';
import { marketService } from './services/market.service';
import { startGttWorker } from './workers/gtt.worker';
import { startAlertWorker } from './workers/alert.worker';
import { startLimitOrderWorker } from './workers/limitOrder.worker';
import { startDailyBonusWorker } from './workers/dailyBonus.worker';

const start = async () => {
  console.log(`\n🚀 Starting TraVirt API [${env.NODE_ENV}]...\n`);

  // ── Database ──────────────────────────────────────────────────────────────
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err);
    process.exit(1);
  }

  // ── Migrations ────────────────────────────────────────────────────────────
  try {
    console.log('📦 Running migrations...');
    await runMigrations();
    console.log('✅ Migrations complete\n');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }

  // ── Market data + background workers ─────────────────────────────────────
  await marketService.start();
  startGttWorker();
  startAlertWorker();
  startLimitOrderWorker();
  startDailyBonusWorker();
  console.log(`✅ Market service started [${env.ALICE_USER_ID ? 'LIVE' : 'SIMULATION'}]`);

  // ── Server ────────────────────────────────────────────────────────────────
  const app = await buildApp();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`\n✅ API listening on http://localhost:${env.PORT}`);
  console.log(`   Health: http://localhost:${env.PORT}/health`);
  console.log(`   Auth:   http://localhost:${env.PORT}/api/auth\n`);

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    marketService.stop();
    await app.close();
    await pool.end();
    console.log('Server closed.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
