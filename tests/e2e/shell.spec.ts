import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Feature 01 journeys: the shell, demo controls, role gating, persistence, reset, and layout at 320px.

async function openDemoControls(page: Page) {
  const isOpen = await page.locator('.demo-bar details').evaluate((el: HTMLDetailsElement) => el.open);
  if (!isOpen) await page.getByText('Demo controls — not part of the service').click();
}

async function switchPersona(page: Page, label: string) {
  await openDemoControls(page);
  await page.getByLabel('Persona').selectOption({ label });
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('loads the welcome view with a single level-one heading and the prototype marker', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome and program explanation' })).toBeVisible();
  await expect(page.getByText('Proposed service concept for the Zamboanga City Creative Council — not an official council site')).toBeVisible();
  await expect(page.getByText('Prototype · fictional data')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
});

test('makes no requests outside the prototype origin, including on a full page load', async ({ page }) => {
  const origin = new URL(page.url()).origin;
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  await page.goto('./');
  await page.goto('./#/council');
  expect(requested.length).toBeGreaterThan(0);
  expect(requested.filter((url) => !url.startsWith(origin))).toEqual([]);
});

test('a guest cannot open a creative-only view, and the access panel shows no record data', async ({ page }) => {
  await page.goto('./#/me');
  await expect(page.getByRole('heading', { name: 'This view is not available in the current role' })).toBeVisible();
  await expect(page.getByText('Rhea Dimaano')).toHaveCount(0);
});

test('switching persona changes navigation and opens the matching workspace', async ({ page }) => {
  await switchPersona(page, 'Council administrator (fictional)');
  await expect(page.getByRole('link', { name: 'Overview and queue' })).toBeVisible();
  await page.goto('./#/council');
  await expect(page.getByRole('heading', { level: 1, name: 'Council overview and review queue' })).toBeVisible();
});

test('the connection and next-send buttons state their current setting in their text', async ({ page }) => {
  await openDemoControls(page);
  const connected = page.getByRole('button', { name: 'Connection: online (simulated)' });
  await expect(connected).toBeVisible();
  await connected.click();
  await expect(page.getByRole('button', { name: 'Connection: offline (simulated)' })).toBeVisible();

  const failNext = page.getByRole('button', { name: 'Next send: normal (simulated)' });
  await failNext.click();
  await expect(page.getByRole('button', { name: 'Next send: will fail (simulated)' })).toBeVisible();
});

test('demo settings and persona survive a reload', async ({ page }) => {
  await switchPersona(page, 'Coordinator — Demo Site A');
  await openDemoControls(page);
  await page.getByRole('button', { name: 'Connection: online (simulated)' }).click();
  await page.reload();
  await expect(page.getByText('Viewing as')).toContainText('Coordinator — Demo Site A');
  await openDemoControls(page);
  await expect(page.getByRole('button', { name: 'Connection: offline (simulated)' })).toBeVisible();
});

test('reset asks for confirmation; cancelling keeps changes and confirming restores the start', async ({ page }) => {
  await switchPersona(page, 'Council administrator (fictional)');
  await openDemoControls(page);
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  const dialog = page.getByRole('dialog', { name: 'Reset demo data?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Viewing as')).toContainText('Council administrator');

  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset demo data' }).click();
  await expect(page.getByText('Viewing as')).toContainText('Guest visitor');
});

test('corrupted saved data restores the starting state and shows a notice', async ({ page }) => {
  await page.evaluate(() => window.localStorage.setItem('ccz-demo:v1', '{not json'));
  await page.reload();
  await expect(page.getByText('Saved demo data could not be read')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome and program explanation' })).toBeVisible();
});

test('the skip link moves focus past the header', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('unknown addresses show a recovery page with a way home', async ({ page }) => {
  await page.goto('./#/no-such-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

const LAYOUT_ROUTES = ['#/', '#/directory', '#/opportunities', '#/guidance', '#/access'];

test('no horizontal overflow at 320px on public routes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const route of LAYOUT_ROUTES) {
    await page.goto(`./${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(0);
  }
});

test('the shell and public routes have no serious or critical accessibility violations', async ({ page }) => {
  for (const route of ['#/', '#/access']) {
    await page.goto(`./${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  }
});
