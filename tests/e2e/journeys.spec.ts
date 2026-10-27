import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  ACCESS_DENIED_HEADING,
  NOTIFICATION_LABEL,
  PERSONA,
  QUEUED_LABEL,
  SYNTHETIC_LABEL,
  VERIFIED_LABEL,
  choosePersona,
  expectNoExternalRequests,
  installNetworkGuard,
  mustFind,
  overviewFigures,
  readSaved,
  resetDemo,
  setConnection,
  setNextSendFails,
  type SavedState,
} from './support';

// Feature 09 journeys. Each story starts from Reset (Demo controls) and follows DEMO.md.
// Locators use roles and visible names. Every test also fails if any request leaves the prototype origin.

const MIKA = 'Mika (demo)';
const JUN_NAME = 'Jun Maker (fictional)';
const JUN_DISPLAY = 'Jun Maker (demo)';
const JUN_CONTACT = 'jun@demo.invalid';
const COUNCIL_REASON = 'Work evidence: please add a short description of the illustration process (fictional).';
const CLINIC_INSTRUCTIONS = 'Arrive at the fictional Demo Site A hall 15 minutes early.';
const CLINIC_TITLE = 'Portfolio Feedback Clinic (fictional)';
const SEARCH_LABEL = 'Search by name, domain, practice, skill, or general location';

test.beforeEach(async ({ page }, testInfo) => {
  installNetworkGuard(page, testInfo);
  await page.goto('./');
});

test.afterEach(async ({ page }) => {
  expectNoExternalRequests(page);
});

/** Escapes text for use inside a RegExp, so names with parentheses match literally. */
function literal(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

function recordNamed(saved: SavedState, displayName: string) {
  return mustFind(saved.data.records.find((record) => record.intake.displayName === displayName), `record ${displayName}`);
}

function queueCardFor(page: Page, displayName: string): Locator {
  return page.locator('article.queue-item').filter({ hasText: displayName });
}

/** Opens a received record from the council queue (New by default, or a named tab) by its display name. */
async function openCouncilRecord(page: Page, displayName: string, tab?: 'resubmitted') {
  await page.goto('./#/council');
  if (tab) await page.getByRole('button', { name: 'Resubmitted', exact: true }).click();
  await page.getByRole('link', { name: literal(displayName) }).click();
}

test('main story: Mika is registered privately, verified, offered a clinic place, confirmed, and recorded as attended', async ({ page }) => {
  await resetDemo(page);
  await choosePersona(page, PERSONA.council);
  await page.goto('./#/council');
  const before = await overviewFigures(page);
  expect(before.newApplications).toEqual({ count: 1, total: 9 });

  // 1. Coordinator resumes Mika's assisted draft (listing off, coordinator-mediated follow-up).
  await choosePersona(page, PERSONA.coordA);
  await page.goto('./#/coordinator');
  await page.getByRole('link', { name: 'Resume draft' }).click();
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();
  await expect(page.getByLabel('Name for the council record')).toHaveValue('Mika (fictional)');
  await page.getByRole('button', { name: 'Continue to creative practice' }).click();
  await expect(page.getByLabel('Creative domain')).toHaveValue('Visual Arts');
  await expect(page.getByLabel('Specific creative practice')).toHaveValue('Illustration');
  await expect(page.getByLabel('Skills')).toHaveValue('Character design, Picture-book pages');
  await expect(page.getByLabel('General location')).toHaveValue('Area 2 (broad, fictional)');
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await expect(page.getByLabel('Description or link text')).toHaveValue(/Described in person: twelve picture-book pages/);
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await expect(page.getByRole('heading', { name: 'Check your information' })).toBeVisible();
  await expect(page.getByLabel('I want to be considered for the public directory')).not.toBeChecked();

  // 2. Offline submit: a device reference, and the council has not received it.
  await page.getByLabel('I understand what information is collected and how it is used.').check();
  await setConnection(page, false);
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText(QUEUED_LABEL)).toBeVisible();
  const queued = mustFind((await readSaved(page)).data.queue.find((item) => item.fields.displayName === MIKA), 'Mika queue item');
  expect(queued).toMatchObject({ status: 'waiting', kind: 'new_application' });
  await expect(page.getByText(queued.deviceRef, { exact: false })).toBeVisible();
  expect((await readSaved(page)).data.records.some((record) => record.intake.displayName === MIKA)).toBe(false);

  // The council counts do not change while the item sits on the coordinator device.
  await choosePersona(page, PERSONA.council);
  await page.goto('./#/council');
  expect(await overviewFigures(page)).toEqual(before);

  // Persistence: a reload mid-story keeps the device queue and the persona.
  await choosePersona(page, PERSONA.coordA);
  await page.goto('./#/coordinator');
  await page.reload();
  await expect(page.getByText('Viewing as')).toContainText(PERSONA.coordA);
  await expect(queueCardFor(page, MIKA).getByText(QUEUED_LABEL)).toBeVisible();

  // 3. Reconnect, make the next send fail, sync, then retry the same device item.
  await setConnection(page, true);
  await setNextSendFails(page, true);
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText('Sending failed. Nothing was received; retry this item when connected.')).toBeVisible();
  await expect(queueCardFor(page, MIKA).getByText('The council has not received this.')).toBeVisible();
  expect((await readSaved(page)).data.records.some((record) => record.intake.displayName === MIKA)).toBe(false);
  await queueCardFor(page, MIKA).getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('This item was received by the council.')).toBeVisible();
  const afterRetry = await readSaved(page);
  const mikaRecord = recordNamed(afterRetry, MIKA);
  expect(afterRetry.data.records.filter((record) => record.intake.displayName === MIKA)).toHaveLength(1);
  expect(afterRetry.data.queue.filter((item) => item.fields.displayName === MIKA)).toEqual([
    expect.objectContaining({ id: queued.id, status: 'delivered', deviceRef: queued.deviceRef, deliveredRecordId: mikaRecord.id }),
  ]);
  const reference = mikaRecord.application.reference;
  expect(reference).toMatch(/^CCZ-\d{4}$/);
  await expect(queueCardFor(page, MIKA).getByRole('link', { name: 'Open the same record' })).toHaveAttribute('href', `#/coordinator/records/${mikaRecord.id}`);

  // 4. Council starts review and requests changes with the exact reason.
  await choosePersona(page, PERSONA.council);
  await openCouncilRecord(page, MIKA);
  await expect(page.getByRole('heading', { name: `${MIKA} · ${reference}` })).toBeVisible();
  await page.getByRole('button', { name: 'Start review' }).click();
  await page.getByLabel('Council reason for changes or decline').fill(COUNCIL_REASON);
  await page.getByRole('button', { name: 'Request changes' }).click();
  await expect(page.getByText('Decision saved in the demo record.')).toBeVisible();
  await expect(page.getByText('Changes requested — see reason').first()).toBeVisible();

  // 5. Coordinator reads the exact reason and helps correct the same record.
  await choosePersona(page, PERSONA.coordA);
  await page.goto('./#/coordinator');
  await page.getByLabel('Name or council reference').fill('Mika');
  await page.getByRole('button', { name: 'Search assigned records' }).click();
  await page.locator('section').filter({ has: page.getByRole('heading', { name: 'Search existing records before adding' }) })
    .getByRole('link', { name: MIKA }).click();
  await expect(page.getByRole('heading', { name: MIKA })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Current council request' }).getByText(COUNCIL_REASON)).toBeVisible();
  await page.getByRole('link', { name: 'Help correct', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to creative practice' }).click();
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await page.getByLabel('Description or link text').fill('Described in person: twelve picture-book pages with a short note on the illustration process (fictional)');
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await expect(page.getByLabel('I want to be considered for the public directory')).not.toBeChecked();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText(`Reference ${reference}.`)).toBeVisible();
  expect(recordNamed(await readSaved(page), MIKA)).toMatchObject({ id: mikaRecord.id, application: { reference, state: 'received', version: 2 } });

  // 6. Council opens the resubmitted record, starts review, and approves membership. Mika stays unlisted.
  await choosePersona(page, PERSONA.council);
  await openCouncilRecord(page, MIKA, 'resubmitted');
  await page.getByRole('button', { name: 'Start review' }).click();
  await page.getByRole('button', { name: 'Approve membership' }).click();
  await expect(page.getByText('Decision saved in the demo record.')).toBeVisible();
  await expect(page.getByText('Opted out')).toBeVisible();
  expect(recordNamed(await readSaved(page), MIKA)).toMatchObject({ optedIn: false, application: { state: 'verified' } });
  await expect(page.getByText(VERIFIED_LABEL, { exact: true })).toBeVisible();

  // Mika is absent from the public directory after verification.
  await choosePersona(page, PERSONA.guest);
  await page.goto('./#/directory');
  await page.getByLabel(SEARCH_LABEL).fill('Mika');
  await expect(page.getByText('No listed creatives match')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Mika');

  // 7. Council invites Mika to the fictional clinic. The coordinator sends an account invitation so Mika can claim this record.
  await choosePersona(page, PERSONA.coordA);
  await page.goto(`./#/coordinator/records/${mikaRecord.id}`);
  await page.getByRole('button', { name: 'Send account invitation' }).click();
  const inviteFeedback = page.getByRole('status').filter({ hasText: 'Simulated invitation ready' });
  await expect(inviteFeedback).toBeVisible();
  const code = (await inviteFeedback.innerText()).match(/INV-\d+/)?.[0];
  expect(code).toBeTruthy();
  await page.goto('./#/access?mode=claim');
  await page.getByLabel('Fictional creative account').selectOption('mika');
  await page.getByLabel('Invitation code').fill(code!);
  await page.getByRole('button', { name: 'Link existing record' }).click();
  await expect(page.getByRole('heading', { name: 'My home and application status' })).toBeVisible();
  await expect(page.getByText(reference, { exact: false }).first()).toBeVisible();
  await expect(page.getByText(VERIFIED_LABEL, { exact: true })).toBeVisible();
  const claimed = await readSaved(page);
  expect(claimed.data.records.filter((record) => record.intake.displayName === MIKA)).toHaveLength(1);
  expect(recordNamed(claimed, MIKA).personId).toBe('person-mika');

  await choosePersona(page, PERSONA.council);
  await page.goto('./#/council/referrals/opp-clinic');
  await page.getByRole('listitem').filter({ hasText: MIKA }).getByRole('button', { name: 'Invite creative' }).click();
  await expect(page.getByText('Invitation recorded.')).toBeVisible();
  const offer = mustFind((await readSaved(page)).data.referrals.find((item) => item.recordId === mikaRecord.id && item.opportunityId === 'opp-clinic'), 'Mika clinic referral');
  expect(offer).toMatchObject({ origin: 'invitation', state: 'offered' });

  // 8. Mika agreed with the coordinator, who relays the response.
  await choosePersona(page, PERSONA.coordA);
  await page.goto(`./#/coordinator/records/${mikaRecord.id}`);
  await page.getByLabel('The person told me they agree with this response.').check();
  await page.getByRole('button', { name: 'Relay response' }).click();
  await expect(page.getByText('The person’s acceptance was relayed and recorded with coordinator assistance.')).toBeVisible();

  // 9. Council confirms the place with practical instructions, then records attendance.
  await choosePersona(page, PERSONA.council);
  await page.goto('./#/council/referrals/opp-clinic');
  const mikaRow = page.locator('article.readback-group').filter({ hasText: MIKA });
  await mikaRow.getByLabel('Practical instructions for confirmation').fill(CLINIC_INSTRUCTIONS);
  await mikaRow.getByRole('button', { name: 'Confirm place' }).click();
  await expect(page.getByText('Place confirmed.')).toBeVisible();
  await mikaRow.getByLabel('Record outcome').selectOption('completed');
  await mikaRow.getByRole('button', { name: 'Record outcome' }).click();
  await expect(page.getByText('Outcome recorded.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Attended / completed (support received) · 1' })).toBeVisible();

  // 10. Mika sees the same state in her own referral. The relayed step is recorded with the coordinator.
  await choosePersona(page, PERSONA.mika);
  await page.goto(`./#/me/referrals/${offer.id}`);
  await expect(page.getByRole('heading', { name: CLINIC_TITLE })).toBeVisible();
  await expect(page.getByText('Attended / completed (support received)', { exact: true })).toBeVisible();
  await expect(page.getByText('Recorded with coordinator assistance.').first()).toBeVisible();

  // 11. Coordinator record shows the same reference, status, and relayed history.
  await choosePersona(page, PERSONA.coordA);
  await page.goto(`./#/coordinator/records/${mikaRecord.id}`);
  await expect(page.getByText(reference, { exact: true })).toBeVisible();
  await expect(page.getByText(VERIFIED_LABEL, { exact: true })).toBeVisible();
  await expect(page.getByText('Attended / completed (support received)', { exact: true })).toBeVisible();
  await expect(page.getByText('With coordinator assistance (coord-a).').first()).toBeVisible();

  // 12. Council record, referral tracker, and overview agree with the other screens.
  await choosePersona(page, PERSONA.council);
  await page.goto(`./#/council/applications/${mikaRecord.id}`);
  await expect(page.getByRole('heading', { name: `${MIKA} · ${reference}` })).toBeVisible();
  await expect(page.getByText(VERIFIED_LABEL, { exact: true })).toBeVisible();
  await page.goto('./#/council/referrals/opp-clinic');
  await page.locator('article.readback-group').filter({ hasText: MIKA }).getByText('Referral history').click();
  await expect(page.locator('article.readback-group').filter({ hasText: MIKA }).getByText('relayed by coord-a').first()).toBeVisible();

  await page.goto('./#/council');
  const after = await overviewFigures(page);
  expect(after.verified).toEqual({ count: before.verified.count + 1, total: before.verified.total + 1 });
  expect(after.newApplications.count).toBe(before.newApplications.count);
  expect(after.cumulativeConfirmed).toEqual({ count: before.cumulativeConfirmed.count + 1, total: before.cumulativeConfirmed.total + 1 });
  expect(after.cumulativeAttended).toEqual({ count: before.cumulativeAttended.count + 1, total: before.cumulativeAttended.total + 1 });
  expect(after.currentConfirmed.count).toBe(before.currentConfirmed.count);
  expect(after.currentAttended.count).toBe(before.currentAttended.count + 1);
  expect(after.siteA).toEqual({ count: before.siteA.count + 1, total: before.siteA.total + 1 });
  await expect(page.getByText(SYNTHETIC_LABEL, { exact: true })).toBeVisible();

  // 13. A guest still cannot find Mika, and her private profile link gives the same unavailable response.
  await choosePersona(page, PERSONA.guest);
  await page.goto(`./#/directory/${mikaRecord.id}`);
  await expect(page.getByRole('heading', { name: 'This profile is not publicly listed' })).toBeVisible();
  await page.goto('./#/directory');
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This profile is not publicly listed' })).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Mika');

  // 14. Mika's own status page still shows the same reference and verified membership after the outcome.
  await choosePersona(page, PERSONA.mika);
  await page.goto('./#/me');
  await expect(page.getByRole('heading', { name: 'My home and application status' })).toBeVisible();
  await expect(page.getByText(reference, { exact: false }).first()).toBeVisible();
  await expect(page.getByText(VERIFIED_LABEL, { exact: true })).toBeVisible();
});

test('alternate story: Jun signs up from an opportunity, is verified, lists publicly, and unlists again', async ({ page }) => {
  await resetDemo(page);
  await page.goto('./#/opportunities/opp-clinic');
  await page.getByRole('link', { name: 'Register to take part' }).click();
  await page.getByLabel('Demo contact').fill(JUN_CONTACT);
  await page.getByRole('button', { name: 'Continue to simulated verification' }).click();
  await expect(page.getByText('Nothing is sent.')).toBeVisible();
  await page.getByLabel('Simulated code').fill('000000');
  await page.getByRole('button', { name: 'Complete demo verification and continue' }).click();
  await expect(page.getByText('You started from Portfolio Feedback Clinic')).toBeVisible();

  // Shared intake: names, domain plus specific practice, one public work example, and one private note.
  await page.getByLabel('Name for the council record').fill(JUN_NAME);
  await page.getByLabel('Display name').fill(JUN_DISPLAY);
  await page.getByRole('button', { name: 'Continue to creative practice' }).click();
  await page.getByLabel('Creative domain').selectOption('Audiovisual Media');
  await page.getByLabel('Specific creative practice').fill('Short documentary editing (fictional)');
  await page.getByLabel('General location').selectOption('Area 3 (broad, fictional)');
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await page.getByRole('button', { name: 'Add a work example' }).click();
  await page.getByLabel('Description or link text').fill('A short editing sample (fictional)');
  await page.getByLabel('OK to show publicly if I choose a public listing').check();
  await page.getByRole('button', { name: 'Add a work example' }).click();
  await page.getByLabel('Description or link text').nth(1).fill('Private process notes (fictional)');
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await expect(page.getByRole('heading', { name: 'Check your information' })).toBeVisible();
  await expect(page.getByLabel('I want to be considered for the public directory')).not.toBeChecked();
  await page.getByLabel('I understand what information is collected and how it is used.').check();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText('Received by the council', { exact: false })).toBeVisible();
  const junRecord = mustFind((await readSaved(page)).data.records.find((record) => record.personId === 'person-jun'), 'Jun record');
  expect(junRecord).toMatchObject({ optedIn: false, application: { state: 'received' } });
  const reference = junRecord.application.reference;

  // Council verifies membership and approves the public content.
  await choosePersona(page, PERSONA.council);
  await openCouncilRecord(page, JUN_DISPLAY);
  await page.getByRole('button', { name: 'Start review' }).click();
  await page.getByRole('button', { name: 'Approve membership' }).click();
  await expect(page.getByText('Decision saved in the demo record.')).toBeVisible();
  await expect(page.getByRole('heading', { name: `${JUN_DISPLAY} · ${reference}` })).toBeVisible();
  await expect(page.getByText(VERIFIED_LABEL, { exact: true })).toBeVisible();

  // Jun turns the public listing on in profile preferences.
  await choosePersona(page, PERSONA.jun);
  await page.goto('./#/me');
  await expect(page.getByText(VERIFIED_LABEL, { exact: true })).toBeVisible();
  await page.goto('./#/me/profile');
  await page.getByLabel('I want my profile considered for the public directory').check();
  await expect(page.getByText('Listed in directory', { exact: true })).toBeVisible();

  // A guest finds Jun in the directory. The profile shows the council route and only public fields.
  await choosePersona(page, PERSONA.guest);
  await page.goto('./#/directory');
  await page.getByLabel(SEARCH_LABEL).fill('Jun Maker');
  await page.getByRole('link', { name: JUN_DISPLAY }).click();
  await expect(page.getByRole('heading', { name: JUN_DISPLAY })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ask the council about this creative' })).toBeVisible();
  await expect(page.getByText('Council contact route (placeholder — not yet approved).')).toBeVisible();
  await expect(page.getByText('A short editing sample (fictional)')).toBeVisible();
  const profileText = await page.locator('main').innerText();
  for (const hidden of [JUN_CONTACT, JUN_NAME, 'Private process notes (fictional)', 'Demo contact']) {
    expect(profileText, `public profile must not show "${hidden}"`).not.toContain(hidden);
  }

  // Jun turns the listing off. Verification stays, and the profile leaves the directory at once.
  await choosePersona(page, PERSONA.jun);
  await page.goto('./#/me/profile');
  await page.getByLabel('I want my profile considered for the public directory').uncheck();
  await expect(page.getByText('Your profile is no longer listed.')).toBeVisible();
  await expect(page.getByText('Not listed (private)', { exact: true }).first()).toBeVisible();
  await page.goto('./#/me');
  await expect(page.getByText(VERIFIED_LABEL, { exact: true })).toBeVisible();
  await choosePersona(page, PERSONA.guest);
  await page.goto('./#/directory');
  await page.getByLabel(SEARCH_LABEL).fill('Jun Maker');
  await expect(page.getByText('No listed creatives match')).toBeVisible();
});

test('decline and human review: council declines with a reason, a person reopens the review, and the decision is upheld', async ({ page }) => {
  await resetDemo(page);
  // The baseline already has Lorenz declined with one open human-review case from Site B.
  await choosePersona(page, PERSONA.coordB);
  await page.goto('./#/coordinator/records/rec-lorenz');
  await expect(page.getByRole('heading', { name: 'Lorenz Villanueva (demo)' })).toBeVisible();
  await page.getByRole('button', { name: 'Send account invitation' }).click();
  const code = (await page.getByRole('status').filter({ hasText: 'Simulated invitation ready' }).innerText()).match(/INV-\d+/)?.[0];
  expect(code).toBeTruthy();
  await page.goto('./#/access?mode=claim');
  await page.getByLabel('Fictional creative account').selectOption('jun');
  await page.getByLabel('Invitation code').fill(code!);
  await page.getByRole('button', { name: 'Link existing record' }).click();
  await expect(page.getByRole('heading', { name: 'My home and application status' })).toBeVisible();
  await expect(page.getByText('Declined — see reason; you can request a human review')).toBeVisible();
  await expect(page.getByText('Your request is waiting for the council: Please have a person check my practice description before the decision stands.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request a human review' })).toHaveCount(0);

  await choosePersona(page, PERSONA.council);
  await page.goto('./#/council?tab=cases');
  await page.getByRole('link', { name: 'Open record and case' }).and(page.locator('a[href="#/council/applications/rec-lorenz"]')).click();
  await expect(page.getByRole('heading', { name: 'Human review' })).toBeVisible();
  await page.getByLabel('Reopen council review').check();
  await page.getByLabel('Resolution note').fill('A person reviewed the description again (fictional).');
  await page.getByRole('button', { name: 'Reopen review' }).click();
  await expect(page.getByText('Decision saved in the demo record.')).toBeVisible();
  await expect(page.getByText('Under council review').first()).toBeVisible();
  await page.getByLabel('Council reason for changes or decline').fill('Decision upheld after a second review (fictional).');
  await page.getByRole('button', { name: 'Decline', exact: true }).click();
  await expect(page.getByText('Decision saved in the demo record.')).toBeVisible();
  await expect(page.getByText('Declined — see reason').first()).toBeVisible();

  await choosePersona(page, PERSONA.jun);
  await page.goto('./#/me');
  await expect(page.getByText('Declined — see reason; you can request a human review')).toBeVisible();
  await page.getByRole('button', { name: 'Request a human review' }).click();
  await page.getByLabel('Why should a person review this decision?').fill('Please consider the second description (fictional).');
  await page.getByRole('button', { name: 'Send human-review request' }).click();
  await expect(page.getByText('Your request is waiting for the council: Please consider the second description (fictional).')).toBeVisible();
  const cases = (await readSaved(page)).data.cases.filter((item) => item.recordId === 'rec-lorenz');
  expect(cases.filter((item) => item.kind === 'human_review' && item.state === 'open')).toHaveLength(1);
});

test('duplicate resolution: approval stays blocked until a possible duplicate is resolved as not a duplicate', async ({ page }) => {
  await resetDemo(page);
  await choosePersona(page, PERSONA.council);
  await page.goto('./#/council/applications/rec-joel-2');
  await expect(page.getByRole('button', { name: 'Approve membership' })).toBeDisabled();
  await expect(page.getByText('Resolve the possible duplicate before approval.')).toBeVisible();
  await page.getByLabel('Reason for linking or keeping separate').fill('Different practice and sample set (fictional).');
  await page.getByRole('button', { name: 'Not a duplicate' }).click();
  await expect(page.getByText('Decision saved in the demo record.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve membership' })).toBeEnabled();
  await page.getByRole('button', { name: 'Approve membership' }).click();
  await expect(page.getByText(VERIFIED_LABEL, { exact: true })).toBeVisible();
  const joel2 = mustFind((await readSaved(page)).data.records.find((record) => record.id === 'rec-joel-2'), 'rec-joel-2');
  expect(joel2.application).toMatchObject({ state: 'verified', duplicate: { status: 'not_duplicate' } });
});

test('capacity full: an accepted place cannot be confirmed when every place is already in use', async ({ page }) => {
  await resetDemo(page);
  // The print workshop has one place, already confirmed for Vina in the baseline. A fixture adds Noel's accepted
  // response from before the place filled up; that step is seeded because invitations are refused once a place is full.
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    saved.state.data.referrals.push({
      id: 'ref-capacity-noel', recordId: 'rec-noel', opportunityId: 'opp-print', origin: 'invitation', state: 'accepted',
      reason: null, via: null, instructions: null, updatedAt: '2026-10-26T09:00:00.000Z',
    });
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();

  await choosePersona(page, PERSONA.council);
  await page.goto('./#/council/referrals/opp-print');
  await expect(page.getByText('1 of 1 places allocated or still in use.', { exact: false })).toBeVisible();
  const noelRow = page.locator('article.readback-group').filter({ hasText: 'Noel Pascual (demo)' });
  await expect(noelRow.getByText('Accepted — waiting for council confirmation')).toBeVisible();
  await expect(noelRow.getByRole('button', { name: 'Confirm place' })).toBeDisabled();
  await expect(noelRow.getByText('All places are in use. Confirmation is blocked until a place is available.')).toBeVisible();
  const state = await readSaved(page);
  const used = state.data.referrals.filter((item) => item.opportunityId === 'opp-print' && ['confirmed', 'completed', 'did_not_attend', 'awaiting_follow_up'].includes(item.state));
  expect(used).toHaveLength(1);
  expect(state.data.referrals.find((item) => item.id === 'ref-capacity-noel')?.state).toBe('accepted');
});

test('conflict resolution: a coordinator can discard a queued correction without changing the council record', async ({ page }) => {
  await resetDemo(page);
  await choosePersona(page, PERSONA.coordA);
  await page.goto('./#/coordinator');
  const gwen = queueCardFor(page, 'Gwen Alcantara (demo)');
  await expect(gwen.getByText('Needs attention — the council record changed', { exact: true })).toBeVisible();
  const recordBefore = JSON.stringify((await readSaved(page)).data.records.find((record) => record.id === 'rec-gwen'));
  await gwen.getByRole('button', { name: 'Discard queued change' }).click();
  await page.getByRole('dialog', { name: 'Discard queued change?' }).getByRole('button', { name: 'Discard change' }).click();
  await expect(page.getByText('Queued change discarded. The council record was not changed.')).toBeVisible();
  const after = await readSaved(page);
  expect(after.data.queue.some((item) => item.id === 'queue-gwen')).toBe(false);
  expect(JSON.stringify(after.data.records.find((record) => record.id === 'rec-gwen'))).toBe(recordBefore);
});

test('direct URLs are denied for a guest and for the other site’s coordinator before private data renders', async ({ page }) => {
  await resetDemo(page);
  await choosePersona(page, PERSONA.guest);
  for (const route of ['./#/council/applications/rec-ines', './#/council/referrals/opp-clinic', './#/coordinator/records/rec-ines']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: ACCESS_DENIED_HEADING })).toBeVisible();
    await expect(page.locator('main')).not.toContainText('Ines Cabrera');
  }
  await choosePersona(page, PERSONA.coordB);
  await page.goto('./#/coordinator/records/rec-rhea');
  await expect(page.getByRole('heading', { name: ACCESS_DENIED_HEADING })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Rhea Dimaano');
  await page.goto('./#/council/applications/rec-ines');
  await expect(page.getByRole('heading', { name: ACCESS_DENIED_HEADING })).toBeVisible();
});

test('reload mid-decision keeps the council decision, and Reset returns the overview to its baseline counts', async ({ page }) => {
  await resetDemo(page);
  await choosePersona(page, PERSONA.council);
  await page.goto('./#/council');
  const baseline = await overviewFigures(page);

  await page.goto('./#/council/applications/rec-ines');
  await page.getByRole('button', { name: 'Start review' }).click();
  await page.getByRole('button', { name: 'Approve membership' }).click();
  await expect(page.getByText('Decision saved in the demo record.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Viewing as')).toContainText(PERSONA.council);
  await expect(page.getByText(VERIFIED_LABEL, { exact: true })).toBeVisible();
  await page.goto('./#/council');
  expect((await overviewFigures(page)).verified).toEqual({ count: baseline.verified.count + 1, total: baseline.verified.total });

  await resetDemo(page);
  await choosePersona(page, PERSONA.council);
  await page.goto('./#/council');
  expect(await overviewFigures(page)).toEqual(baseline);
  await expect(page.getByText(SYNTHETIC_LABEL, { exact: true })).toBeVisible();
  await expect(page.getByText(NOTIFICATION_LABEL).first()).toBeVisible();
});
