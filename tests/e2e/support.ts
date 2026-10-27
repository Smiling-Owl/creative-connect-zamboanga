import { expect, type Page, type TestInfo } from '@playwright/test';

// Shared helpers for the Feature 09 journey and accessibility specs. Everything here is test-only:
// it drives the real demo controls and reads the saved demo envelope. No production code is touched.

export const STORAGE_KEY = 'ccz-demo:v1';

export const PERSONA = {
  guest: 'Guest visitor',
  mika: 'Mika (fictional illustrator)',
  jun: 'Jun (fictional video editor)',
  rhea: 'Rhea (fictional designer, verified)',
  noel: 'Noel (fictional filmmaker, verified)',
  coordA: 'Coordinator — Demo Site A',
  coordB: 'Coordinator — Demo Site B',
  council: 'Council administrator (fictional)',
} as const;

export const SYNTHETIC_LABEL = 'Synthetic demo data — not real results';
export const NOTIFICATION_LABEL = 'In-app example — no SMS or email is sent';
export const QUEUED_LABEL = 'Queued on this device — the council has not received it';
export const VERIFIED_LABEL = 'Verified member (council checks passed — not a quality rating)';
export const ACCESS_DENIED_HEADING = 'This view is not available in the current role';

/** Saved demo envelope fields that the journey specs read. Only the fields they use are typed. */
export interface SavedRecord {
  id: string;
  personId: string | null;
  optedIn: boolean;
  inviteCode: string | null;
  intake: { name: string; displayName: string; domain: string; practice: string; area: string };
  application: { reference: string; state: string; version: number; updatePending: boolean; duplicate: { status: string } | null };
}
export interface SavedQueueItem {
  id: string;
  deviceRef: string;
  status: string;
  kind: string;
  recordId: string | null;
  deliveredRecordId: string | null;
  fields: { displayName: string };
}
export interface SavedReferral {
  id: string;
  recordId: string;
  opportunityId: string;
  state: string;
  origin: string;
}
export interface SavedState {
  personaId: string;
  settings: { online: boolean; failNextSend: boolean };
  data: {
    records: SavedRecord[];
    queue: SavedQueueItem[];
    referrals: SavedReferral[];
    cases: { id: string; recordId: string; kind: string; state: string }[];
    audit: { action: string; entityId: string; via: string | null }[];
  };
}

/** Records every request that leaves the prototype origin. Checked in afterEach by each spec. */
const externalRequests = new WeakMap<Page, string[]>();

export function installNetworkGuard(page: Page, testInfo: TestInfo) {
  const baseURL = testInfo.project.use.baseURL ?? 'http://localhost:4173/';
  const origin = new URL(baseURL).origin;
  const seen: string[] = [];
  externalRequests.set(page, seen);
  page.on('request', (request) => {
    if (!request.url().startsWith(origin)) seen.push(request.url());
  });
}

export function expectNoExternalRequests(page: Page) {
  expect(externalRequests.get(page) ?? [], 'requests outside the prototype origin').toEqual([]);
}

/** Opens the demo controls for one action, then closes them again if they were closed before. */
export async function demoAction<T>(page: Page, action: () => Promise<T>): Promise<T> {
  const details = page.locator('.demo-bar details');
  const wasOpen = await details.evaluate((element: HTMLDetailsElement) => element.open);
  if (!wasOpen) await details.locator('summary').click();
  try {
    return await action();
  } finally {
    if (!wasOpen) await details.locator('summary').click();
  }
}

export async function choosePersona(page: Page, label: string) {
  await demoAction(page, () => page.getByLabel('Persona').selectOption({ label }));
}

export async function resetDemo(page: Page) {
  await demoAction(page, async () => {
    await page.getByRole('button', { name: 'Reset demo data' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reset demo data' }).click();
  });
  await expect(page.getByText('Viewing as')).toContainText(PERSONA.guest);
}

export async function setConnection(page: Page, online: boolean) {
  await demoAction(page, async () => {
    const toggle = page.getByRole('button', { name: /^Connection: (online|offline) \(simulated\)$/ });
    const isOnline = (await toggle.innerText()).includes('online');
    if (isOnline !== online) await toggle.click();
  });
}

export async function setNextSendFails(page: Page, fails: boolean) {
  await demoAction(page, async () => {
    const toggle = page.getByRole('button', { name: /^Next send: (normal|will fail) \(simulated\)$/ });
    const willFail = (await toggle.innerText()).includes('will fail');
    if (willFail !== fails) await toggle.click();
  });
}

export async function readSaved(page: Page): Promise<SavedState> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state as SavedState);
}

/** Seeds the persona directly in the saved envelope, for keyboard-only runs that must not click the demo controls. */
export async function seedPersona(page: Page, personaId: string) {
  await page.goto('./');
  await page.evaluate((id) => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    saved.state.personaId = id;
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  }, personaId);
  await page.reload();
}

/** Parses "N of M" from a council overview figure row. */
export async function figure(page: Page, region: string, row: string): Promise<{ count: number; total: number }> {
  const text = await page.getByRole('region', { name: region }).getByRole('row', { name: new RegExp(row) }).getByRole('cell').innerText();
  const match = text.match(/(\d+) of (\d+)/);
  if (!match) throw new Error(`No "N of M" figure in ${region} / ${row}: ${text}`);
  return { count: Number(match[1]), total: Number(match[2]) };
}

/** The council overview figures used by the journeys, read from M01. */
export async function overviewFigures(page: Page) {
  return {
    verified: await figure(page, 'Records by status', 'Verified member'),
    newApplications: await figure(page, 'Pending reviews', 'New applications'),
    listed: await figure(page, 'Listed and private verified members', 'Listed in directory'),
    cumulativeConfirmed: await figure(page, 'Referral funnel, cumulative', 'Place confirmed'),
    cumulativeAttended: await figure(page, 'Referral funnel, cumulative', 'Attended or completed'),
    currentConfirmed: await figure(page, 'Current referrals by state', 'Place confirmed'),
    currentAttended: await figure(page, 'Current referrals by state', 'Attended / completed'),
    siteA: await figure(page, 'Coverage by site', 'Demo Site A'),
  };
}

export function mustFind<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`Missing ${what} in saved demo state`);
  return value;
}
