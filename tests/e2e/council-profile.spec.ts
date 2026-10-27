import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function choosePersona(page: import('@playwright/test').Page, label: string) {
  const details = page.locator('.demo-bar details');
  const wasOpen = await details.evaluate((element: HTMLDetailsElement) => element.open);
  if (!wasOpen) await details.locator('summary').click();
  await page.getByLabel('Persona').selectOption({ label });
  if (!wasOpen) await details.locator('summary').click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('council queues expose received records, search, and query-aware records navigation', async ({ page }) => {
  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council');
  await expect(page.getByRole('link', { name: 'Overview and queue' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('CCZ-0009')).toBeVisible();
  await expect(page.getByText('draft-mika')).toHaveCount(0);
  await page.getByRole('button', { name: 'Record search' }).click();
  await expect(page.getByRole('link', { name: 'Creative records' })).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(/tab=records/);
  await page.getByLabel('Search reference, display name, or intake source').fill('CCZ-0009');
  await expect(page.getByRole('link', { name: /CCZ-0009/ })).toBeVisible();
});

test('council requires a reason, returns focus, then records a requested correction', async ({ page }) => {
  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council/applications/rec-ines');
  await page.getByRole('button', { name: 'Start review' }).click();
  const reason = page.getByLabel('Council reason for changes or decline');
  await page.getByRole('button', { name: 'Request changes' }).click();
  await expect(reason).toBeFocused();
  await reason.fill('Please describe one additional work sample.');
  await page.getByRole('button', { name: 'Request changes' }).click();
  await expect(page.getByText('Decision saved in the demo record.')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}'));
  expect(saved.state.data.records.find((record: { id: string }) => record.id === 'rec-ines').application).toMatchObject({ state: 'changes_requested', reason: 'Please describe one additional work sample.' });
});

test('linked duplicate preserves both records and the keeper can inspect the alias history', async ({ page }) => {
  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council/applications/rec-joel-2');
  await page.getByLabel('Reason for linking or keeping separate').fill('The records refer to the same fictional creative. Keep histories separate.');
  await page.getByRole('button', { name: 'Link to existing record' }).click();
  await page.goto('./#/council/applications/rec-joel');
  await expect(page.getByRole('heading', { name: 'Linked record history · read only' })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}'));
  expect(saved.state.data.records.filter((record: { id: string }) => ['rec-joel', 'rec-joel-2'].includes(record.id))).toHaveLength(2);
});

test('council can approve public content after membership was verified without reviewing the listing', async ({ page }) => {
  await choosePersona(page, 'Council administrator (fictional)');
  await page.evaluate(() => {
    const key = 'ccz-demo:v1';
    const envelope = JSON.parse(window.localStorage.getItem(key) ?? '{}');
    const record = envelope.state.data.records.find((item: { id: string }) => item.id === 'rec-noel');
    record.publicApprovedFingerprint = null;
    window.localStorage.setItem(key, JSON.stringify(envelope));
  });
  await page.reload();
  await page.goto('./#/council/applications/rec-noel');
  await expect(page.getByRole('heading', { name: 'Public content review' })).toBeVisible();
  await page.getByRole('button', { name: 'Approve public content' }).click();
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}'));
  expect(saved.state.data.records.find((record: { id: string }) => record.id === 'rec-noel').publicApprovedFingerprint).not.toBeNull();
});

test('creative profile edits keep membership and hide changed public content until review', async ({ page }) => {
  await choosePersona(page, 'Noel (fictional filmmaker, verified)');
  await page.goto('./#/me/profile');
  await expect(page.getByText(/over the 90-day demo reminder interval/)).toBeVisible();
  const skills = page.getByLabel('Skills · council review, separated by commas');
  await skills.fill('Editing, ');
  await expect(skills).toHaveValue('Editing, ');
  await skills.fill('Editing, Color grading');
  await page.getByLabel('Specific creative practice').fill('Documentary editing and short film');
  await page.getByRole('button', { name: 'Save profile changes' }).click();
  await expect(page.getByText('Profile saved. Membership remains verified; reviewed changes wait for council approval.')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}'));
  expect(saved.state.data.records.find((record: { id: string }) => record.id === 'rec-noel')).toMatchObject({ optedIn: true, application: { state: 'verified', updatePending: true } });
  await page.getByLabel('Reason for your request').fill('Please remove this profile from the directory.');
  await page.getByRole('button', { name: 'Request withdrawal' }).click();
  const withdrawn = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}'));
  expect(withdrawn.state.data.records.find((record: { id: string }) => record.id === 'rec-noel').optedIn).toBe(false);
  expect(withdrawn.state.data.cases.some((item: { recordId: string; kind: string; state: string }) => item.recordId === 'rec-noel' && item.kind === 'withdrawal' && item.state === 'open')).toBe(true);
  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council?tab=cases');
  await page.getByRole('link', { name: 'Open record and case' }).and(page.locator('a[href="#/council/applications/rec-noel"]')).click();
  await page.getByLabel('Resolution note').fill('Withdrawal recorded. No information was deleted.');
  await page.getByRole('button', { name: 'Resolve case' }).click();
  await choosePersona(page, 'Noel (fictional filmmaker, verified)');
  await page.goto('./#/me/profile');
  await expect(page.getByText('Withdrawal recorded. No information was deleted.')).toBeVisible();
});

test('direct guest profile access reveals no editor or record fields', async ({ page }) => {
  await page.goto('./#/me/profile');
  await expect(page.getByRole('heading', { name: 'This view is not available in the current role' })).toBeVisible();
  await expect(page.getByLabel('Name for council record')).toHaveCount(0);
  await choosePersona(page, 'Mika (fictional illustrator)');
  await page.goto('./#/me/profile');
  await expect(page.getByRole('heading', { name: 'Profile editor unavailable' })).toBeVisible();
  await expect(page.getByLabel('Name for council record')).toHaveCount(0);
});

test('switching creative personas on the same profile route never carries private edits across records', async ({ page }) => {
  await choosePersona(page, 'Noel (fictional filmmaker, verified)');
  await page.goto('./#/me/profile');
  await page.getByLabel('Name for council record · private').fill('Unsubmitted private edit for Noel');
  await choosePersona(page, 'Rhea (fictional designer, verified)');
  await expect(page.getByLabel('Name for council record · private')).toHaveValue('Rhea Dimaano (demo)');
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}'));
  expect(saved.state.data.records.find((record: { id: string }) => record.id === 'rec-noel').intake.name).toBe('Noel Pascual (demo)');
});

test('council and profile views fit a narrow viewport and pass axe checks', async ({ page }) => {
  await choosePersona(page, 'Council administrator (fictional)');
  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ['./#/council', './#/council/applications/rec-ines']) {
    await page.goto(route);
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 320);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
  }
  await choosePersona(page, 'Noel (fictional filmmaker, verified)');
  await page.goto('./#/me/profile');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 320);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});
