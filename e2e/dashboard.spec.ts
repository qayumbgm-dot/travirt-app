import { test, expect } from './fixtures/auth.fixture';
import type { Page } from '@playwright/test';

const mainNav = (page: Page) =>
  page.getByRole('navigation', { name: 'Main navigation' });

test.describe('Dashboard — post-login smoke', () => {
  test('title is "Dashboard — TraVirt" after session restore', async ({ loggedInPage: page }) => {
    await expect(page).toHaveTitle(/Dashboard.*TraVirt/i);
  });

  test('main navigation has Portfolio, Orders, and Funds buttons', async ({ loggedInPage: page }) => {
    await expect(mainNav(page).getByRole('button', { name: 'Portfolio' })).toBeVisible();
    await expect(mainNav(page).getByRole('button', { name: 'Orders' })).toBeVisible();
    await expect(mainNav(page).getByRole('button', { name: 'Funds' })).toBeVisible();
  });

  test('clicking Orders changes title to "Orders — TraVirt"', async ({ loggedInPage: page }) => {
    await mainNav(page).getByRole('button', { name: 'Orders' }).click();
    await expect(page).toHaveTitle(/Orders.*TraVirt/i);
  });

  test('clicking Portfolio changes title to "Portfolio — TraVirt"', async ({ loggedInPage: page }) => {
    await mainNav(page).getByRole('button', { name: 'Portfolio' }).click();
    await expect(page).toHaveTitle(/Portfolio.*TraVirt/i);
  });

  test('clicking Funds changes title to "Funds — TraVirt"', async ({ loggedInPage: page }) => {
    await mainNav(page).getByRole('button', { name: 'Funds' }).click();
    await expect(page).toHaveTitle(/Funds.*TraVirt/i);
  });

  test('watchlist sidebar renders on dashboard', async ({ loggedInPage: page }) => {
    // The sidebar tabs are always visible — verify at least one renders
    await expect(page.getByRole('button', { name: 'Watchlist' })).toBeVisible();
  });
});
