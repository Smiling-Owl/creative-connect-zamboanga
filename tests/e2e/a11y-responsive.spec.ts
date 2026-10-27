import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  NOTIFICATION_LABEL,
  SYNTHETIC_LABEL,
  expectNoExternalRequests,
  installNetworkGuard,
  seedPersona,
} from './support';

// Feature 09 accessibility and responsive checks.
// Every route in src/routes.ts is visited in a key state for its role. Each is checked for horizontal overflow at
// 320, 360, 768, and 1280 px. axe (default rules) runs at 320 and 1280 px and must report no serious or critical violation.
// Keyboard-only runs use Tab, Shift+Tab, Enter, and Space only, and the simulation notices are asserted on screen.

const WIDTHS = [320, 360, 768, 1280];
const AXE_WIDTHS = new Set([320, 1280]);

interface RouteCase {
  id: string;
  hash: string;
}

/** Key states per persona. The persona is seeded in the saved demo envelope, the same state the Demo controls select. */
const COVERAGE: { persona: string; routes: RouteCase[] }[] = [
  {
    persona: 'guest',
    routes: [
      { id: 'P01', hash: '#/' },
      { id: 'P02', hash: '#/directory' },
      { id: 'P03 listed', hash: '#/directory/rec-rhea' },
      { id: 'P03 not listed', hash: '#/directory/rec-joel' },
      { id: 'P04', hash: '#/opportunities' },
      { id: 'P05', hash: '#/opportunities/opp-clinic' },
      { id: 'P06', hash: '#/guidance' },
      { id: 'A01 sign in', hash: '#/access' },
      { id: 'A01 sign up', hash: '#/access?mode=signup' },
      { id: 'A01 verify', hash: '#/access?mode=verify' },
      { id: 'A01 claim', hash: '#/access?mode=claim' },
      { id: 'A01 staff invitation', hash: '#/access?mode=staff' },
      { id: 'A01 help', hash: '#/access?mode=help' },
      { id: 'A02 recovery', hash: '#/access/recover' },
      { id: 'A02 expired link', hash: '#/access/recover?state=expired' },
      { id: 'Not found', hash: '#/no-such-page' },
    ],
  },
  {
    persona: 'jun',
    routes: [
      { id: 'R01 step 1', hash: '#/apply?step=1&draftId=draft-jun' },
      { id: 'R01 step 2', hash: '#/apply?step=2&draftId=draft-jun' },
      { id: 'R01 step 3', hash: '#/apply?step=3&draftId=draft-jun' },
      { id: 'R02 review', hash: '#/apply/review?draftId=draft-jun' },
    ],
  },
  {
    persona: 'rhea',
    routes: [
      { id: 'C01 home', hash: '#/me' },
      { id: 'C03 list', hash: '#/me/referrals' },
      { id: 'C03 offer detail', hash: '#/me/referrals/ref-0004' },
    ],
  },
  { persona: 'noel', routes: [{ id: 'C02 profile', hash: '#/me/profile' }] },
  {
    persona: 'coord-a',
    routes: [
      { id: 'F01 workspace', hash: '#/coordinator' },
      { id: 'F01 follow-ups', hash: '#/coordinator?tab=followups' },
      { id: 'F02 assisted record', hash: '#/coordinator/records/rec-rhea' },
      { id: 'R01 assisted draft', hash: '#/apply?draftId=draft-mika' },
    ],
  },
  {
    persona: 'council',
    routes: [
      { id: 'M01 new queue', hash: '#/council' },
      { id: 'M01 record search', hash: '#/council?tab=records' },
      { id: 'M01 cases', hash: '#/council?tab=cases' },
      { id: 'M02 application review', hash: '#/council/applications/rec-ines' },
      { id: 'M03 opportunities', hash: '#/council/opportunities' },
      { id: 'M04 opportunity editor', hash: '#/council/opportunities/opp-clinic/edit' },
      { id: 'M05 referral tracker', hash: '#/council/referrals' },
      { id: 'M05 roster', hash: '#/council/referrals/opp-clinic' },
    ],
  },
];

test.beforeEach(async ({ page }, testInfo) => {
  installNetworkGuard(page, testInfo);
  await page.goto('./');
});

test.afterEach(async ({ page }) => {
  expectNoExternalRequests(page);
});

/** Tab forward (or Shift+Tab backward) with the keyboard until the target control has focus. */
async function tabUntil(page: Page, target: Locator, limit = 200) {
  for (let step = 0; step < limit; step += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Keyboard focus did not reach the requested control.');
}

async function serious(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.slice(0, 3).map((node) => node.target.join(' ')).join(' | ')}`);
}

for (const group of COVERAGE) {
  test(`every ${group.persona} route fits 320, 360, 768, and 1280px, and axe finds no serious or critical issue at 320 and 1280px`, async ({ page }) => {
    test.setTimeout(420_000);
    await seedPersona(page, group.persona);
    for (const route of group.routes) {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`./${route.hash}`);
        await expect(page.locator('main h1'), `${route.id} heading at ${width}px`).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${route.id}: horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
        if (AXE_WIDTHS.has(width)) {
          expect(await serious(page), `${route.id}: serious or critical axe violations at ${width}px`).toEqual([]);
        }
      }
    }
  });
}

test('council review error is reached and announced by keyboard alone: an empty reason returns focus to the reason field', async ({ page }) => {
  await seedPersona(page, 'council');
  await page.goto('./#/council/applications/rec-ines');
  await tabUntil(page, page.getByRole('button', { name: 'Start review' }));
  await page.keyboard.press('Enter');
  await tabUntil(page, page.getByRole('button', { name: 'Request changes' }));
  await page.keyboard.press('Enter');
  const reason = page.getByLabel('Council reason for changes or decline');
  await expect(reason).toBeFocused();
  await expect(page.getByRole('status').filter({ hasText: 'Add a reason before requesting changes.' })).toBeVisible();
  await page.keyboard.type('Please describe one additional work sample (fictional).');
  await tabUntil(page, page.getByRole('button', { name: 'Request changes' }));
  await page.keyboard.press('Enter');
  await expect(page.getByText('Decision saved in the demo record.')).toBeVisible();
});

test('coordinator sync failure and retry are announced through the polite status region, keyboard only', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    saved.state.personaId = 'coord-a';
    saved.state.settings.online = true;
    saved.state.settings.failNextSend = true;
    const item = saved.state.data.queue.find((entry: { id: string }) => entry.id === 'queue-gwen');
    item.status = 'waiting';
    item.baseVersion = 2;
    item.lastError = null;
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  await page.goto('./#/coordinator');
  await tabUntil(page, page.getByRole('button', { name: 'Sync now' }));
  await page.keyboard.press('Enter');
  const failed = page.locator('[aria-live="polite"]').filter({ hasText: 'Sending failed. Nothing was received; retry this item when connected.' });
  await expect(failed).toBeVisible();
  await tabUntil(page, page.getByRole('button', { name: 'Retry' }));
  await page.keyboard.press('Enter');
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: 'This item was received by the council.' })).toBeVisible();
});

test('a creative responds to a place offer with keyboard only', async ({ page }) => {
  await seedPersona(page, 'rhea');
  await page.goto('./#/me/referrals/ref-0004');
  await expect(page.getByRole('heading', { name: 'Short Film Sound Workshop (fictional)' })).toBeVisible();
  await tabUntil(page, page.getByRole('checkbox', { name: 'I have reviewed the offer details and want to respond.' }));
  await page.keyboard.press('Space');
  await expect(page.getByRole('checkbox', { name: 'I have reviewed the offer details and want to respond.' })).toBeChecked();
  await tabUntil(page, page.getByRole('button', { name: 'Accept offer' }));
  await page.keyboard.press('Enter');
  await expect(page.getByText('You accepted this offer. The council still needs to confirm a place.')).toBeVisible();
});

test('simulation notices are visible on access, recovery, the coordinator queue, notifications, and council reporting', async ({ page }) => {
  const note = (text: string) => page.getByRole('note').filter({ hasText: text });

  await seedPersona(page, 'guest');
  await page.goto('./#/access');
  await expect(note('no credentials are processed or sent')).toBeVisible();
  await page.goto('./#/access/recover');
  await expect(note('no credentials are processed or sent')).toBeVisible();

  await seedPersona(page, 'coord-a');
  await page.goto('./#/coordinator');
  await expect(note('device storage and connectivity are simulated in this browser')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Notifications' }).getByText(NOTIFICATION_LABEL)).toBeVisible();

  await seedPersona(page, 'rhea');
  await page.goto('./#/me');
  await expect(page.getByRole('region', { name: 'Notifications' }).getByText(NOTIFICATION_LABEL)).toBeVisible();

  await seedPersona(page, 'council');
  await page.goto('./#/council');
  await expect(page.getByText(SYNTHETIC_LABEL, { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Recent activity and notifications' }).getByText(NOTIFICATION_LABEL)).toBeVisible();
});

/** Approximates browser zoom at 200% by scaling the root with CSS zoom. At 1280px and 640px viewports this is a 640px and 320px layout at 200%. */
const ZOOM_ROUTES: { persona: string; hash: string }[] = [
  { persona: 'guest', hash: '#/' },
  { persona: 'guest', hash: '#/directory' },
  { persona: 'guest', hash: '#/access' },
  { persona: 'jun', hash: '#/apply?step=2&draftId=draft-jun' },
  { persona: 'jun', hash: '#/apply/review?draftId=draft-jun' },
  { persona: 'rhea', hash: '#/me' },
  { persona: 'coord-a', hash: '#/coordinator' },
  { persona: 'coord-a', hash: '#/coordinator/records/rec-rhea' },
  { persona: 'council', hash: '#/council' },
  { persona: 'council', hash: '#/council/applications/rec-ines' },
  { persona: 'council', hash: '#/council/referrals/opp-clinic' },
];

test('key routes stay free of horizontal overflow and serious axe issues at 200% zoom (CSS zoom approximation)', async ({ page }) => {
  test.setTimeout(300_000);
  let persona = '';
  for (const route of ZOOM_ROUTES) {
    if (route.persona !== persona) {
      await seedPersona(page, route.persona);
      persona = route.persona;
    }
    for (const width of [640, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`./${route.hash}`);
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).zoom), 'CSS zoom applied').toBe('2');
      await expect(page.locator('main h1')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route.hash} at 200% zoom with ${width}px viewport: horizontal overflow`).toBeLessThanOrEqual(0);
      expect(await serious(page), `${route.hash} at 200% zoom with ${width}px viewport`).toEqual([]);
    }
  }
});
