import { request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BACKEND  = process.env.BACKEND_URL ?? 'http://localhost:3001';
const AUTH_DIR = path.join(process.cwd(), '.playwright');

/**
 * Runs once before any test suite.
 * Registers a fresh test user via the backend API, then saves the auth cookies
 * (including the httpOnly refresh_token) and credentials to disk.
 *
 * Requires the backend to be running before `npm run test:e2e` is invoked.
 * The Vite dev server is managed automatically by playwright.config.ts webServer.
 */
export default async function globalSetup() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const runId = Date.now().toString().slice(-8);
  const creds = {
    userId:   `E2E${runId}`,
    email:    `e2e_${runId}@test.travirt.local`,
    password: 'E2eTest@99!',
  };

  const ctx = await request.newContext({ baseURL: BACKEND });
  try {
    const res = await ctx.post('/api/auth/register', { data: creds });
    if (!res.ok()) {
      const body = await res.text();
      throw new Error(`E2E setup: registration failed (${res.status()}): ${body}`);
    }
    const { accessToken } = await res.json();

    // Captures cookies (including httpOnly refresh_token) for browser context reuse
    await ctx.storageState({ path: path.join(AUTH_DIR, 'auth.json') });

    // Persist access token for API-only fixtures (token is short-lived; fixtures refresh it)
    fs.writeFileSync(
      path.join(AUTH_DIR, 'creds.json'),
      JSON.stringify({ ...creds, accessToken }, null, 2),
    );
  } finally {
    await ctx.dispose();
  }
}
