import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function choosePersona(page: import('@playwright/test').Page, label: string) {
  const summary = page.locator('.demo-bar details summary');
  const wasOpen = await page.locator('.demo-bar details').evaluate((element: HTMLDetailsElement) => element.open);
  if (!wasOpen) await summary.click();
  await page.getByLabel('Persona').selectOption({ label });
  if (!wasOpen) await summary.click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await choosePersona(page, 'Coordinator — Demo Site A');
});

test('workspace requires an assigned-site search before add and explains offline duplicate checks', async ({ page }) => {
  await page.goto('./#/coordinator');
  await expect(page.getByRole('heading', { name: 'Coordinator workspace' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add creative' })).toBeDisabled();
  await page.getByLabel('Name or council reference').fill('New demo creative');
  await page.getByRole('button', { name: 'Search assigned records' }).click();
  await expect(page.getByText('No assigned record matches this search.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add creative' })).toBeEnabled();

  const details = page.locator('.demo-bar details summary');
  await details.click();
  await page.getByRole('button', { name: 'Connection: online (simulated)' }).click();
  await details.click();
  await expect(page.getByRole('button', { name: 'Add creative' })).toBeEnabled();
  await page.getByRole('button', { name: 'Add creative' }).click();
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();
});

test('the conflict view compares queued and current fields and resubmits the same record once', async ({ page }) => {
  await page.goto('./#/coordinator');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    const item = saved.state.data.queue.find((entry: { id: string }) => entry.id === 'queue-gwen');
    item.fields = {
      ...item.fields,
      name: 'Queued council name', displayName: 'Queued display name', domain: 'Digital Interactive Media',
      practice: 'Queued practice', skills: ['Queued skill'], area: 'Queued area', interests: ['Queued interest'],
      followUp: { kind: 'own_channel', channelLabel: 'Queued fictional route' },
      evidence: [{ id: 'queued-evidence', kind: 'link', text: 'Queued work evidence', publicApproved: true }], acknowledged: false,
    };
    item.optedIn = true;
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  await expect(page.getByText('Needs attention — the council record changed since this was queued.')).toBeVisible();
  await expect(page.getByText('Queued change and current council record')).toBeVisible();
  await expect(page.locator('.conflict-row span').filter({ hasText: /^Queued$/ }).first()).toBeVisible();
  await expect(page.locator('.conflict-row span').filter({ hasText: /^Current record$/ }).first()).toBeVisible();
  for (const field of ['Name for the council record', 'Display name', 'Creative domain', 'Specific practice', 'Skills', 'General location', 'Support interests', 'Follow-up arrangement', 'Work evidence', 'Information-use acknowledgment', 'Public listing choice']) {
    await expect(page.getByText(field, { exact: true })).toBeVisible();
  }
  const before = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data.records.length);
  await page.getByRole('button', { name: 'Review and resubmit' }).click();
  await expect(page.getByText('This item was received by the council.')).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data);
  expect(state.records).toHaveLength(before);
  expect(state.records.find((record: { id: string }) => record.id === 'rec-gwen').application.version).toBe(3);
  expect(state.queue.filter((item: { id: string }) => item.id === 'queue-gwen')).toHaveLength(1);
  expect(state.queue.find((item: { id: string }) => item.id === 'queue-gwen').status).toBe('delivered');
});

test('switching coordinator personas during Sending cancels stale UI and allows sync to resume', async ({ page }) => {
  await page.goto('./#/coordinator');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    const item = saved.state.data.queue.find((entry: { id: string }) => entry.id === 'queue-gwen');
    item.status = 'waiting';
    item.baseVersion = 2;
    item.lastError = null;
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText('Sending…').first()).toBeVisible();
  const details = page.locator('.demo-bar details summary');
  await details.click();
  await page.getByLabel('Persona').selectOption({ label: 'Coordinator — Demo Site B' });
  await page.getByLabel('Persona').selectOption({ label: 'Coordinator — Demo Site A' });
  await details.click();
  await expect(page.getByRole('button', { name: 'Sync now' })).toBeEnabled();
  await expect(page.getByText('Queued on this device — the council has not received it')).toBeVisible();
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data.queue.find((item: { id: string }) => item.id === 'queue-gwen').status)).toBe('delivered');
  await expect(page.getByRole('status')).toContainText('All waiting items were sent.');
});

test('a stale version discovered during sync remains a conflict and is never announced as received', async ({ page }) => {
  await page.goto('./#/coordinator');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    const item = saved.state.data.queue.find((entry: { id: string }) => entry.id === 'queue-gwen');
    item.status = 'waiting';
    item.baseVersion = 1;
    item.lastError = null;
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText('Needs attention — the council record changed', { exact: true })).toBeVisible();
  const result = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data.queue.find((item: { id: string }) => item.id === 'queue-gwen'));
  expect(result.status).toBe('conflict');
});

test('agreement to relay one offer does not carry over to another offer form', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    const existing = saved.state.data.referrals.find((item: { id: string }) => item.id === 'ref-0004');
    saved.state.data.referrals.push({ ...existing, id: 'ref-extra-offer', opportunityId: 'opp-clinic', updatedAt: '2026-10-26T09:00:00.000Z' });
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  await page.goto('./#/coordinator/records/rec-rhea');
  const consent = page.getByLabel('The person told me they agree with this response.');
  await expect(consent).toHaveCount(2);
  await consent.first().check();
  await expect(consent.first()).toBeChecked();
  await expect(consent.nth(1)).not.toBeChecked();
});

test('failed send can be retried once after reconnection, with the same device item', async ({ page }) => {
  await page.goto('./#/coordinator');
  const summary = page.locator('.demo-bar details summary');
  await summary.click();
  await page.getByRole('button', { name: 'Connection: online (simulated)' }).click();
  await summary.click();
  await page.getByRole('button', { name: 'Search assigned records' }).click();
  await page.goto('./#/apply');
  await page.getByRole('button', { name: 'Continue to creative practice' }).click();
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await page.getByLabel('I understand what information is collected and how it is used.').check();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText('Queued on this device — the council has not received it')).toBeVisible();
  const queued = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data.queue.find((item: { fields: { displayName: string } }) => item.fields.displayName === 'Mika (demo)'));
  expect(queued.status).toBe('waiting');
  await page.goto('./#/coordinator');
  await summary.click();
  await page.getByRole('button', { name: 'Next send: normal (simulated)' }).click();
  await page.getByRole('button', { name: 'Connection: offline (simulated)' }).click();
  await summary.click();
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText('Sending failed — retry when connected')).toBeVisible();
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('This item was received by the council.')).toBeVisible();
  const result = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data);
  expect(result.records.filter((record: { intake: { displayName: string } }) => record.intake.displayName === 'Mika (demo)')).toHaveLength(1);
  expect(result.queue.filter((item: { id: string }) => item.id === queued.id)).toHaveLength(1);
  expect(result.queue.find((item: { id: string }) => item.id === queued.id)).toMatchObject({ status: 'delivered', deviceRef: queued.deviceRef, attempts: 2 });
  await page.goto('./#/apply/review?draftId=draft-mika');
  await expect(page.getByText('Received by the council')).toBeVisible();
  await expect(page.getByText(result.records.find((record: { intake: { displayName: string } }) => record.intake.displayName === 'Mika (demo)').application.reference)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open assisted record' })).toHaveAttribute('href', `#/coordinator/records/${result.records.find((record: { intake: { displayName: string } }) => record.intake.displayName === 'Mika (demo)').id}`);
});

test('Site B cannot read a Site A record through its direct URL', async ({ page }) => {
  await choosePersona(page, 'Coordinator — Demo Site B');
  await page.goto('./#/coordinator/records/rec-rhea');
  await expect(page.getByRole('heading', { name: 'This view is not available in the current role' })).toBeVisible();
  await expect(page.getByText('Rhea Dimaano')).toHaveCount(0);
});

test('assisted record follow-up, relayed offer and invitation keep audit attribution and link the same record', async ({ page }) => {
  await page.goto('./#/coordinator/records/rec-rhea');
  await expect(page.getByRole('heading', { name: 'Rhea' })).toBeVisible();
  await page.getByLabel('Record a follow-up note').fill('Asked for a follow-up next week (fictional).');
  await page.getByRole('button', { name: 'Save follow-up note' }).click();
  await expect(page.getByText('Follow-up note added to the record timeline.')).toBeVisible();
  await page.getByLabel('The person told me they agree with this response.').check();
  await page.getByRole('button', { name: 'Relay response' }).click();
  await expect(page.getByText('The person’s acceptance was relayed and recorded with coordinator assistance.')).toBeVisible();
  await page.goto('./#/coordinator/records/rec-gwen');
  await expect(page.getByRole('heading', { name: 'Gwen' })).toBeVisible();
  await page.getByRole('button', { name: 'Send account invitation' }).click();
  const inviteFeedback = page.getByRole('status').filter({ hasText: 'Simulated invitation ready' });
  await expect(inviteFeedback).toBeVisible();
  const code = (await inviteFeedback.innerText()).match(/INV-\d+/)?.[0];
  expect(code).toBeTruthy();
  const before = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data.records.length);
  await page.goto('./#/access?mode=claim');
  await page.getByLabel('Fictional creative account').selectOption('mika');
  await page.getByLabel('Invitation code').fill(code!);
  await page.getByRole('button', { name: 'Link existing record' }).click();
  await expect(page.getByRole('heading', { name: 'My home and application status' })).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state);
  expect(state.data.records).toHaveLength(before);
  expect(state.data.records.find((record: { id: string }) => record.id === 'rec-gwen')).toMatchObject({
    personId: 'person-mika', source: { mode: 'assisted', siteId: 'site-a', coordinatorId: 'coord-a' }, application: { reference: 'CCZ-0008' },
  });
  expect(state.data.audit.some((event: { action: string; via: string | null }) => event.action === 'offer_response_relayed' && event.via === 'coord-a')).toBe(true);
});

test('assigned coordinator can maintain an accountless verified profile only with fresh agreement', async ({ page }) => {
  await choosePersona(page, 'Coordinator — Demo Site B');
  await page.goto('./#/coordinator/records/rec-dani');
  await expect(page.getByRole('heading', { name: 'Help maintain this verified profile' })).toBeVisible();
  const before = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data.records.find((record: { id: string }) => record.id === 'rec-dani'));
  expect(before.personId).toBeNull();
  await page.getByLabel('Specific creative practice · council review').fill('Illustration and community storytelling');
  const consent = page.getByLabel('The person reviewed and agreed to this exact profile update.');
  await consent.check();
  await page.getByLabel('General location · council review').selectOption({ label: 'Area 3 (broad, fictional)' });
  await expect(consent).not.toBeChecked();
  await page.getByRole('button', { name: 'Send agreed profile update' }).click();
  await expect(consent).toBeFocused();
  await consent.check();
  await page.getByRole('button', { name: 'Send agreed profile update' }).click();
  await expect(page.getByText(/The agreed profile update was recorded/)).toBeVisible();
  const updated = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data.records.find((record: { id: string }) => record.id === 'rec-dani'));
  expect(updated).toMatchObject({ personId: null, source: before.source, siteId: before.siteId, coordinatorId: before.coordinatorId, optedIn: before.optedIn, application: { reference: before.application.reference, state: 'verified', updatePending: true } });
  expect(updated.intake.followUp).toEqual({ kind: 'coordinator_mediated', coordinatorId: 'coord-b' });
});

test('assisted profile validation focuses names and the add-evidence control', async ({ page }) => {
  await page.goto('./#/coordinator/records/rec-rhea');
  const name = page.getByLabel('Name for council record · private');
  const originalName = await name.inputValue();
  await name.fill('');
  await page.getByRole('button', { name: 'Send agreed profile update' }).click();
  await expect(name).toBeFocused();

  await name.fill(originalName);
  const displayName = page.getByLabel('Public display name · council review');
  const originalDisplayName = await displayName.inputValue();
  await displayName.fill('');
  await page.getByRole('button', { name: 'Send agreed profile update' }).click();
  await expect(displayName).toBeFocused();

  await displayName.fill(originalDisplayName);
  const evidenceCount = await page.getByRole('button', { name: 'Remove evidence' }).count();
  for (let index = 0; index < evidenceCount; index += 1) {
    await page.getByRole('button', { name: 'Remove evidence' }).first().click();
  }
  const addEvidence = page.getByRole('button', { name: 'Add work evidence' });
  await page.getByRole('button', { name: 'Send agreed profile update' }).click();
  await expect(addEvidence).toBeFocused();
});

test('coordinator withdrawal requires consent, immediately unlists, and appears in assigned case history', async ({ page }) => {
  await choosePersona(page, 'Coordinator — Demo Site B');
  await page.goto('./#/coordinator/records/rec-dani');
  await page.getByLabel('Request type').selectOption('withdrawal');
  const reason = page.locator('#assisted-case-reason');
  await reason.fill('The person asked to withdraw this listing (fictional).');
  const consent = page.getByLabel('The person agreed to send this exact request to the council.');
  await consent.check();
  await reason.fill('The person asked to withdraw this listing now (fictional).');
  await expect(consent).not.toBeChecked();
  await page.getByRole('button', { name: 'Send withdrawal request' }).click();
  await expect(consent).toBeFocused();
  await consent.check();
  await page.getByRole('button', { name: 'Send withdrawal request' }).click();
  await expect(page.getByText(/Withdrawal request sent/)).toBeVisible();
  await expect(consent).not.toBeChecked();
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data);
  expect(saved.records.find((record: { id: string }) => record.id === 'rec-dani').optedIn).toBe(false);
  expect(saved.cases.some((item: { recordId: string; kind: string; state: string; openedBy: string; reason: string }) => item.recordId === 'rec-dani' && item.kind === 'withdrawal' && item.state === 'open' && item.openedBy === 'coord-b' && item.reason === 'The person asked to withdraw this listing now (fictional).')).toBe(true);
  await expect(page.getByRole('heading', { name: 'Requests on this record' })).toBeVisible();
  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council?tab=cases');
  await page.locator('a[href="#/council/applications/rec-dani"]').click();
  await page.getByLabel('Resolution note').fill('Withdrawal recorded; no information was deleted.');
  await page.getByRole('button', { name: 'Resolve case' }).click();
  await choosePersona(page, 'Coordinator — Demo Site B');
  await page.goto('./#/coordinator/records/rec-dani');
  await expect(page.getByText('Withdrawal recorded; no information was deleted.').last()).toBeVisible();
});

test('offline F02 maintenance and profile requests explain that they are not queued', async ({ page }) => {
  await choosePersona(page, 'Coordinator — Demo Site B');
  await page.goto('./#/coordinator/records/rec-dani');
  const details = page.locator('.demo-bar details');
  await details.locator('summary').click();
  await page.getByRole('button', { name: 'Connection: online (simulated)' }).click();
  await details.locator('summary').click();
  await expect(page.getByRole('button', { name: 'Send agreed profile update' })).toBeDisabled();
  await expect(page.getByText('A connection is required. This verified-profile update is not queued offline.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send correction request' })).toBeDisabled();
  await expect(page.getByText('A connection is required. Requests are not queued offline.')).toBeVisible();
});

test('coordinator screens remain accessible and fit a 320px viewport', async ({ page }) => {
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 640 });
    for (const route of ['./#/coordinator', './#/coordinator/records/rec-rhea']) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} at ${width}px`).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
      const serious = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
      expect(serious, JSON.stringify(serious.map((violation) => violation.id))).toEqual([]);
    }
  }
});

test('Follow-ups query selects one matching coordinator navigation item', async ({ page }) => {
  await page.goto('./#/coordinator?tab=followups');
  await expect(page.getByRole('link', { name: 'Follow-ups' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'Workspace' })).not.toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Showing assigned records with coordinator-mediated follow-up or an offer awaiting response.')).toBeVisible();
});
