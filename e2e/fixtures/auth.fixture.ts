import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';
import path from 'node:path';

export const BACKEND  = process.env.BACKEND_URL ?? 'http://localhost:3001';
const AUTH_FILE = path.join(process.cwd(), '.playwright/auth.json');

export interface AuthHandle {
  token: string;
  request: APIRequestContext;
}

export const test = base.extend<{
  loggedInPage: Page;
  auth: AuthHandle;
}>({
  /**
   * Browser page that has already restored a session.
   * Loads the app at '/' using the saved auth cookies so that
   * tryRestoreSession() succeeds and AppContent renders.
   */
  loggedInPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const page = await ctx.newPage();
    await page.goto('/');
    // Wait for session to restore — the nav only appears when logged in
    await expect(
      page.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeVisible({ timeout: 15_000 });
    await use(page);
    await ctx.close();
  },

  /**
   * Authenticated API request context.
   * Uses the saved refresh cookie to get a fresh access token, then exposes
   * the underlying APIRequestContext and that token for direct API assertions.
   */
  auth: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const refreshRes = await ctx.request.post(`${BACKEND}/api/auth/refresh`);
    if (!refreshRes.ok()) {
      await ctx.close();
      throw new Error(`auth fixture: token refresh failed (${refreshRes.status()})`);
    }
    const { accessToken: token } = await refreshRes.json();
    await use({ token, request: ctx.request });
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
