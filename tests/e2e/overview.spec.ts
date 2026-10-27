import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Feature 08: council overview, synthetic figures, device-only exclusion, and in-app notification scope.
// Journeys start from Reset and use accessible role and name locators.

const SYNTHETIC_LABEL = 'Synthetic demo data — not real results';
const NOTIFICATION_LABEL = 'In-app example — no SMS or email is sent';

/** Opens the demo controls for one action and closes them again if they were closed. */
async function demoControls(page: Page, action: () => Promise<unknown>) {
  const details = page.locator('.demo-bar details');
  const wasOpen = await details.evaluate((element: HTMLDetailsElement) => element.open);
  if (!wasOpen) await details.locator('summary').click();
  await action();
  if (!wasOpen) await details.locator('summary').click();
}

async function choosePersona(page: Page, label: string) {
  await demoControls(page, () => page.getByLabel('Persona').selectOption({ label }));
}

async function resetDemo(page: Page) {
  await demoControls(page, async () => {
    await page.getByRole('button', { name: 'Reset demo data' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reset demo data' }).click();
  });
}

async function setConnection(page: Page, online: boolean) {
  const current = online ? 'offline' : 'online';
  await demoControls(page, () => page.getByRole('button', { name: `Connection: ${current} (simulated)` }).click());
}

/** The figure text of one row in a named overview region, for example "Pending reviews" and "New applications". */
function figure(page: Page, region: string, row: string) {
  return page.getByRole('region', { name: region }).getByRole('row', { name: new RegExp(row) }).getByRole('cell');
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await resetDemo(page);
});

test('M01 states the synthetic label, each denominator, and its time window after Reset', async ({ page }) => {
  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council');
  await expect(page.getByRole('heading', { name: 'Council overview and review queue' })).toBeVisible();
  await expect(page.getByText(SYNTHETIC_LABEL, { exact: true })).toBeVisible();
  await expect(page.getByText('Device-only starts and submissions are not yet received by the council', { exact: false })).toBeVisible();

  await expect(figure(page, 'Pending reviews', 'New applications')).toContainText('1 of 9 received records (since demo start; current state, as of 2026-10-26)');
  await expect(figure(page, 'Records by status', 'Verified member')).toContainText('5 of 9 received records');
  await expect(figure(page, 'Listed and private verified members', 'Listed in directory')).toContainText('4 of 5 verified members');
  await expect(figure(page, 'Referral funnel, cumulative', 'Place confirmed')).toContainText('5 of 7 referrals started (cumulative from recorded history, since demo start)');
  await expect(figure(page, 'Current referrals by state', 'Place confirmed')).toContainText('2 of 7 referrals (current state, as of 2026-10-26)');
  await expect(figure(page, 'Coverage by site', 'Demo Site A')).toContainText('5 of 9 received records (since demo start)');
  expect(await page.locator('main').innerText()).not.toMatch(/NaN|Infinity/);
});

test('an offline assisted submission stays out of council figures until sync; coordinators see it on their device only', async ({ page }) => {
  await choosePersona(page, 'Coordinator — Demo Site A');
  await page.goto('./#/coordinator');
  await expect(page.getByRole('heading', { name: 'Coordinator workspace' })).toBeVisible();
  await expect(page.getByText('1 item on devices, not received', { exact: false })).toBeVisible();
  await setConnection(page, false);
  await page.getByLabel('Name or council reference').fill('New demo creative');
  await page.getByRole('button', { name: 'Search assigned records' }).click();
  await page.getByRole('button', { name: 'Add creative' }).click();
  await page.getByRole('button', { name: 'Continue to creative practice' }).click();
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await page.getByLabel('I understand what information is collected and how it is used.').check();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText('Queued on this device — the council has not received it').first()).toBeVisible();

  await page.goto('./#/coordinator');
  await expect(page.getByText('2 items on devices, not received', { exact: false })).toBeVisible();

  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council');
  await expect(figure(page, 'Pending reviews', 'New applications')).toContainText('1 of 9 received records');
  await expect(figure(page, 'Coverage by site', 'Demo Site A')).toContainText('5 of 9 received records');

  await choosePersona(page, 'Coordinator — Demo Site A');
  await setConnection(page, true);
  await page.goto('./#/coordinator');
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText('All waiting items were sent.')).toBeVisible();

  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council');
  await expect(figure(page, 'Pending reviews', 'New applications')).toContainText('2 of 10 received records');
  await expect(figure(page, 'Coverage by site', 'Demo Site A')).toContainText('6 of 10 received records');
});

test('each persona notification list carries the label and shows only its own record events', async ({ page }) => {
  await choosePersona(page, 'Coordinator — Demo Site A');
  await page.goto('./#/coordinator');
  await setConnection(page, false);
  await page.getByLabel('Name or council reference').fill('New demo creative');
  await page.getByRole('button', { name: 'Search assigned records' }).click();
  await page.getByRole('button', { name: 'Add creative' }).click();
  await page.getByRole('button', { name: 'Continue to creative practice' }).click();
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await page.getByLabel('I understand what information is collected and how it is used.').check();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await setConnection(page, true);
  await page.goto('./#/coordinator');
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText('All waiting items were sent.')).toBeVisible();

  const siteANotifications = page.getByRole('region', { name: 'Notifications' });
  await expect(siteANotifications).toContainText(NOTIFICATION_LABEL);
  await expect(siteANotifications).toContainText(/The council received application CCZ-\d{4}\./);

  await choosePersona(page, 'Coordinator — Demo Site B');
  await page.goto('./#/coordinator');
  const siteBNotifications = page.getByRole('region', { name: 'Notifications' });
  await expect(siteBNotifications).toContainText(NOTIFICATION_LABEL);
  await expect(siteBNotifications).toContainText('No notifications yet.');
  await expect(siteBNotifications).not.toContainText('The council received application');

  await choosePersona(page, 'Rhea (fictional designer, verified)');
  await page.goto('./#/me');
  await expect(page.getByRole('region', { name: 'Notifications' })).toContainText(NOTIFICATION_LABEL);

  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council');
  await expect(page.getByRole('region', { name: 'Recent activity and notifications' })).toContainText(NOTIFICATION_LABEL);
  await expect(page.getByRole('region', { name: 'Recent activity and notifications' })).toContainText(/The council received application CCZ-\d{4}\./);
});

test('a main story raises verified, cumulative confirmed, and cumulative attended by one; current confirmed falls on attendance', async ({ page }) => {
  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council');
  await expect(figure(page, 'Records by status', 'Verified member')).toContainText('5 of 9 received records');
  await expect(figure(page, 'Referral funnel, cumulative', 'Place confirmed')).toContainText('5 of 7 referrals started');
  await expect(figure(page, 'Current referrals by state', 'Place confirmed')).toContainText('2 of 7 referrals');
  await expect(figure(page, 'Referral funnel, cumulative', 'Attended or completed')).toContainText('1 of 7 referrals started');

  await page.goto('./#/council/applications/rec-ines');
  await page.getByRole('button', { name: 'Start review' }).click();
  await page.getByRole('button', { name: 'Approve membership' }).click();
  await expect(page.getByText('Decision saved in the demo record.')).toBeVisible();
  await page.goto('./#/council');
  await expect(figure(page, 'Records by status', 'Verified member')).toContainText('6 of 9 received records');
  await expect(figure(page, 'Pending reviews', 'New applications')).toContainText('0 of 9 received records');

  await page.goto('./#/council/referrals/opp-film');
  await page.getByRole('button', { name: 'Offer place' }).click();
  await expect(page.getByText('Offer recorded.')).toBeVisible();

  await choosePersona(page, 'Noel (fictional filmmaker, verified)');
  await page.goto('./#/me/referrals/ref-0003');
  await page.getByRole('checkbox', { name: 'I have reviewed the offer details and want to respond.' }).check();
  await page.getByRole('button', { name: 'Accept offer' }).click();
  await expect(page.getByText('You accepted this offer. The council still needs to confirm a place.')).toBeVisible();

  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council/referrals/opp-film');
  await page.getByRole('button', { name: 'Confirm place' }).click();
  await expect(page.getByText('Place confirmed.')).toBeVisible();
  await page.goto('./#/council');
  await expect(figure(page, 'Current referrals by state', 'Place confirmed')).toContainText('3 of 7 referrals');
  await expect(figure(page, 'Referral funnel, cumulative', 'Place confirmed')).toContainText('6 of 7 referrals started');

  await page.goto('./#/council/referrals/opp-film');
  await page.getByLabel('Record outcome').selectOption('completed');
  await page.getByRole('button', { name: 'Record outcome' }).click();
  await expect(page.getByText('Outcome recorded.')).toBeVisible();

  await page.goto('./#/council');
  await expect(figure(page, 'Current referrals by state', 'Place confirmed')).toContainText('2 of 7 referrals');
  await expect(figure(page, 'Current referrals by state', 'Attended / completed')).toContainText('2 of 7 referrals');
  await expect(figure(page, 'Referral funnel, cumulative', 'Place confirmed')).toContainText('6 of 7 referrals started');
  await expect(figure(page, 'Referral funnel, cumulative', 'Attended or completed')).toContainText('2 of 7 referrals started');

  // Cross-view agreement: the same state and capacity appear on M05, C03 (Noel), and M02 (Ines).
  await page.goto('./#/council/referrals/opp-film');
  await expect(page.getByRole('heading', { name: 'Attended / completed (support received) · 1' })).toBeVisible();
  await expect(page.getByText('1 of 4 places allocated', { exact: false })).toBeVisible();

  await choosePersona(page, 'Noel (fictional filmmaker, verified)');
  await page.goto('./#/me/referrals/ref-0003');
  await expect(page.getByText('Attended / completed (support received)', { exact: true })).toBeVisible();

  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council/applications/rec-ines');
  await expect(page.getByText('Verified member (council checks passed — not a quality rating)', { exact: true })).toBeVisible();
});

test('M01 overview is accessible and fits 320px and 360px without horizontal overflow', async ({ page }) => {
  await choosePersona(page, 'Council administrator (fictional)');
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('./#/council');
    await expect(page.getByRole('heading', { name: 'Council overview and review queue' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
    expect(serious, JSON.stringify(serious.map((violation) => violation.id))).toEqual([]);
  }
});
