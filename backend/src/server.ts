import { buildApp } from './app';
import { env } from './config/env';
import { pool } from './database/pool';
import { runMigrations } from './database/migrate';
import { marketService } from './services/market.service';
import { startGttWorker } from './workers/gtt.worker';
import { startAlertWorker } from './workers/alert.worker';
import { startLimitOrderWorker } from './workers/limitOrder.worker';
import { startDailyBonusWorker } from './workers/dailyBonus.worker';
import { refreshInstruments, getInstrumentCount } from './services/instrumentMaster.service';

// Prevent unhandled rejections / uncaught exceptions from killing the process.
// All workers and hooks have .catch() but this is a final safety net.
process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[process] Uncaught exception:', err);
});

const start = async () => {
  console.log(`\n🚀 Starting TraVirt API [${env.NODE_ENV}]...\n`);

  // ── Database ──────────────────────────────────────────────────────────────
  // Neon free tier auto-suspends and cold-starts in 5–15s. Retry a few times so
  // a cold DB on boot doesn't crash the process into a Render restart loop.
  const connectDb = async () => {
    const MAX_TRIES = 5;
    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      try {
        await pool.query('SELECT 1');
        console.log('✅ PostgreSQL connected');
        return;
      } catch (err) {
        console.warn(`[db] connect attempt ${attempt}/${MAX_TRIES} failed: ${(err as Error).message}`);
        if (attempt === MAX_TRIES) throw err;
        await new Promise((r) => setTimeout(r, 3_000));
      }
    }
  };
  try {
    await connectDb();
  } catch (err) {
    console.error('❌ PostgreSQL connection failed after retries:', err);
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

  // ── Server ────────────────────────────────────────────────────────────────
  // Start listening as EARLY as possible. On Render's free tier the instance
  // spins down after inactivity; every cold start must answer requests fast or
  // the proxy returns 502. Heavy init (market feed, workers, instrument master)
  // is deferred to run AFTER listen so it never blocks request handling.
  const app = await buildApp();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`\n✅ API listening on http://localhost:${env.PORT}`);
  console.log(`   Health: http://localhost:${env.PORT}/health`);
  console.log(`   Auth:   http://localhost:${env.PORT}/api/auth\n`);

  // ── Background init (does NOT block listening) ────────────────────────────
  const runRefresh = async () => {
    await refreshInstruments();
    // After instruments load/refresh, reload the market token map and re-subscribe
    await marketService.resubscribeAll();
  };

  // Market data + background workers
  marketService
    .start()
    .then(() => {
      startGttWorker();
      startAlertWorker();
      startLimitOrderWorker();
      startDailyBonusWorker();
      console.log(`✅ Market service started [${env.ALICE_USER_ID ? 'LIVE' : 'SIMULATION'}]`);
    })
    .catch((err) => console.error('[market] start failed:', err));

  // Instrument master
  getInstrumentCount()
    .then((existingCount) => {
      if (existingCount < 100) {
        console.log('📊 Downloading instrument master (first run)...');
        runRefresh().catch((err) =>
          console.warn('[instruments] Background refresh failed:', err.message),
        );
      } else {
        console.log(`✅ Instrument master ready: ${existingCount.toLocaleString()} instruments`);
      }
    })
    .catch((err) => console.warn('[instruments] count check failed:', err.message));

  // Refresh daily at 08:00 IST (02:30 UTC) — new contracts added each day
  const msUntil0830IST = (() => {
    const now  = new Date();
    const next = new Date(now);
    next.setUTCHours(2, 30, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.getTime() - now.getTime();
  })();
  setTimeout(() => {
    runRefresh().catch(console.error);
    setInterval(() => runRefresh().catch(console.error), 24 * 60 * 60 * 1000);
  }, msUntil0830IST);

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
