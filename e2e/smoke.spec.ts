import { test, expect } from '@playwright/test';

test.describe('Smoke — Landing Page', () => {
  test('page loads and has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TraVirt/i);
  });

  test('has skip-to-content link accessible by keyboard', async ({ page }) => {
    await page.goto('/');
    // Tab once to focus the skip link
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();
  });

  test('has get-started call to action', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /get started/i }).first()).toBeVisible();
  });

  test('navigates to login when Get Started is clicked', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).first().click();
    // Should show login form
    await expect(page.getByPlaceholder(/user id or email/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Smoke — API health', () => {
  test('backend health endpoint returns ok', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health');
    // Accept 200 (db ok) or 503 (db not configured in test env) — server must respond
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
  });
});
