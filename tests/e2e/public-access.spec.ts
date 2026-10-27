import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('public discovery hides private records and provides a council route', async ({ page }) => {
  await page.goto('./#/directory');
  await expect(page.getByRole('heading', { name: '4 creatives listed' })).toHaveCount(0);
  await expect(page.getByText('4 creatives listed')).toBeVisible();
  await page.getByRole('link', { name: 'Rhea Dimaano (demo)' }).click();
  await expect(page.getByRole('heading', { name: 'Rhea Dimaano (demo)' })).toBeVisible();
  await expect(page.getByText('rhea@example.invalid')).toHaveCount(0);
  await expect(page.getByText('Ask the council about this creative')).toBeVisible();
  await page.goto('./#/directory/rec-joel');
  await expect(page.getByRole('heading', { name: 'This profile is not publicly listed' })).toBeVisible();
  await expect(page.getByText('Private sample set kept with the council (fictional)')).toHaveCount(0);
  await page.goto('./#/directory/not-a-profile');
  await expect(page.getByRole('heading', { name: 'This profile is not publicly listed' })).toBeVisible();
});

test('opportunity registration and assistance both retain their return destination', async ({ page }) => {
  await page.goto('./#/opportunities/opp-clinic');
  await page.getByRole('link', { name: 'Register to take part' }).click();
  await expect(page).toHaveURL(/returnTo=.*opportunities/);
  await page.getByLabel('Demo contact').fill('rhea@example.invalid');
  await page.getByRole('button', { name: 'Continue to simulated verification' }).click();
  await expect(page.getByText('Nothing is sent.')).toBeVisible();
  await page.getByLabel('Simulated code').fill('000000');
  await page.getByRole('button', { name: 'Complete demo verification and continue' }).click();
  await expect(page.getByText(/started registration from Portfolio Feedback Clinic/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to this opportunity after intake' })).toHaveAttribute('href', '#/opportunities/opp-clinic');
  await page.locator('.demo-bar details summary').click();
  await page.getByLabel('Persona').selectOption({ label: 'Guest visitor' });
  await page.goto('./#/opportunities/opp-clinic');
  await page.getByRole('link', { name: 'Get help registering' }).click();
  await expect(page.getByRole('link', { name: 'Return to the opportunity you came from' })).toHaveAttribute('href', '#/opportunities/opp-clinic');
  await page.goto('./#/access?mode=help&returnTo=https%3A%2F%2Fevil.invalid%2Fopportunities%2Fopp-clinic');
  await expect(page.getByRole('link', { name: 'Return to the opportunity you came from' })).toHaveCount(0);
});

test('claim links the existing record and recovery states remain simulated', async ({ page }) => {
  const before = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data.records.length);
  await page.goto('./#/access?mode=claim');
  await page.getByRole('button', { name: 'Link existing record' }).click();
  await expect(page).toHaveURL(/#\/me$/);
  const after = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state);
  expect(after.data.records.length).toBe(before);
  expect(after.data.records.find((record: { id: string }) => record.id === 'rec-dani')?.personId).toBe('person-jun');
  await page.goto('./#/access/recover?state=expired');
  await expect(page.getByRole('heading', { name: 'This recovery link has expired' })).toBeVisible();
  await expect(page.getByText(/no credentials are processed or sent/i)).toBeVisible();
  await page.getByRole('button', { name: 'Request a new link' }).click();
  await expect(page.getByRole('heading', { name: 'Recover access' })).toBeVisible();
});

test('a closed opportunity keeps its closed status after its deadline', async ({ page }) => {
  await page.goto('./#/opportunities/opp-digital');
  await expect(page.getByText('Closed', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Register to take part' })).toHaveCount(0);
});

test('public and access routes have no serious axe violations or horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const routes = [
    '#/', '#/directory', '#/directory/rec-rhea', '#/directory/rec-joel', '#/opportunities', '#/opportunities/opp-clinic', '#/guidance',
    '#/access', '#/access?mode=signup', '#/access?mode=verify', '#/access?mode=claim', '#/access?mode=staff', '#/access?mode=help', '#/access/recover', '#/access/recover?state=expired', '#/access/recover?state=help',
  ];
  for (const route of routes) {
    await page.goto(`./${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `overflow at ${route}`).toBeLessThanOrEqual(0);
    const isPublic = route === '#/' || route.startsWith('#/directory') || route.startsWith('#/opportunities') || route === '#/guidance';
    if (isPublic) {
      const rendered = await page.locator('main').innerText();
      expect(rendered).not.toContain('rhea@example.invalid');
      expect(rendered).not.toContain('Private sample set kept with the council');
    }
    if (route.includes('#/access')) await expect(page.getByText(/no credentials are processed or sent/i)).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, `${route}: ${JSON.stringify(serious.map((v) => v.id))}`).toEqual([]);
  }
});
