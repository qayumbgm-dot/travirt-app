import { test, expect } from '@playwright/test';

// Unique credentials per test run to avoid conflicts
const RUN_ID = Date.now().toString().slice(-6);
const TEST_USER_ID = `E2E${RUN_ID}`;
const TEST_EMAIL   = `e2e_${RUN_ID}@test.travirt.local`;
const TEST_PASS    = 'E2eTest@1';

test.describe('Auth — Registration', () => {
  test('can navigate to signup and register a new account', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).first().click();
    await page.getByRole('button', { name: /sign up/i }).first().click();

    // Fill registration form
    await page.getByPlaceholder(/user id/i).fill(TEST_USER_ID);
    await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
    // Fill both password fields (first = password, second = confirm)
    const passwordFields = page.getByPlaceholder(/password/i);
    await passwordFields.nth(0).fill(TEST_PASS);
    await passwordFields.nth(1).fill(TEST_PASS);

    await page.getByRole('button', { name: /create account/i }).click();

    // Should reach the app (dashboard or disclaimer modal)
    await expect(page.locator('#root')).not.toContainText('Create Account', { timeout: 10_000 });
  });

  test('shows validation error for an invalid email', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).first().click();
    await page.getByRole('button', { name: /sign up/i }).first().click();

    await page.getByPlaceholder(/user id/i).fill('TESTUSER');
    await page.getByPlaceholder(/email/i).fill('not-an-email');
    const passwordFields = page.getByPlaceholder(/password/i);
    await passwordFields.nth(0).fill(TEST_PASS);
    await passwordFields.nth(1).fill(TEST_PASS);
    await page.getByRole('button', { name: /create account/i }).click();

    // Should stay on signup and show an error
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });
});

test.describe('Auth — Login', () => {
  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /get started/i }).first().click();

    await page.getByPlaceholder(/user id or email/i).fill('NOBODY');
    await page.getByPlaceholder(/password/i).fill('wrongpass');
    await page.getByRole('button', { name: /log in/i }).click();

    // Error toast or error message should appear
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 5_000 });
  });
});
