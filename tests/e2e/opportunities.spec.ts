import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function choosePersona(page: import('@playwright/test').Page, label: string) {
  const details = page.locator('.demo-bar details');
  const summary = details.locator('summary');
  const wasOpen = await details.evaluate((element: HTMLDetailsElement) => element.open);
  if (!wasOpen) await summary.click();
  await page.getByLabel('Persona').selectOption({ label });
  if (!wasOpen) await summary.click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await choosePersona(page, 'Council administrator (fictional)');
});

test('council creates, previews, saves, and publishes an opportunity with focused validation', async ({ page }) => {
  await page.goto('./#/council/opportunities/new/edit');
  const title = page.getByLabel('Title');
  await page.getByRole('button', { name: 'Save draft details' }).click();
  await expect(page.getByRole('alert')).toContainText('Add a title.');
  await expect(title).toBeFocused();

  await title.fill('Portfolio practice session (fictional)');
  await page.getByLabel('Type').selectOption('clinic');
  await page.getByLabel('Fictional provider').fill('Demo practice studio (fictional)');
  await page.getByLabel('Description').fill('A guided session for reviewing creative work samples.');
  await page.getByLabel('Eligibility').fill('Verified creatives (fictional demo).');
  await page.getByLabel('Cost or fee information').fill('No fee (fictional demo).');
  await page.getByLabel('Capacity').fill('3');
  await page.getByLabel('Date or schedule').fill('Saturday 21 November 2026 (fictional).');
  await page.getByLabel('Deadline').fill('2026-11-20');
  await page.getByLabel('Location or delivery mode').fill('Demo Site A hall (fictional).');
  await page.getByLabel('Responsible council owner').fill('Council team (fictional).');
  await page.getByLabel('Next step and confirmation process').fill('Wait for a separate council confirmation.');
  await page.getByLabel('Council contact route').fill('Council contact route (placeholder).');
  await page.getByRole('button', { name: 'Save draft details' }).click();
  await expect(page.getByRole('heading', { name: 'Public preview' })).toBeVisible();
  await expect(page.getByText('Not yet published')).toBeVisible();
  const savedUrl = page.url();
  expect(savedUrl).toContain('/council/opportunities/opp-');
  await page.getByRole('button', { name: 'Publish opportunity' }).click();
  await expect(page.getByRole('status')).toContainText('Opportunity published.');
  const opportunity = await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    return saved.state.data.opportunities.find((item: { title: string }) => item.title === 'Portfolio practice session (fictional)');
  });
  expect(opportunity).toMatchObject({ state: 'published', type: 'clinic', provider: 'Demo practice studio (fictional)', ownerId: 'Council team (fictional).' });
});

test('material edits warn confirmed creatives, capacity stays protected, and cancellation preserves outcomes', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    const data = saved.state.data;
    const rheaFilm = data.referrals.find((item: { id: string }) => item.id === 'ref-0004');
    rheaFilm.opportunityId = 'opp-clinic';
    rheaFilm.state = 'confirmed';
    const rheaOutcome = data.referrals.find((item: { id: string }) => item.id === 'ref-0007');
    rheaOutcome.opportunityId = 'opp-clinic';
    const vinaOutcome = data.referrals.find((item: { id: string }) => item.id === 'ref-0006');
    vinaOutcome.opportunityId = 'opp-clinic';
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  await page.goto('./#/council/opportunities/opp-clinic/edit');
  await page.getByLabel('Capacity').fill('4');
  await expect(page.getByText('4 total · 0 remaining')).toBeVisible();
  await page.getByLabel('Date or schedule').fill('Saturday 28 November 2026 (fictional).');
  await page.getByRole('button', { name: 'Save draft details' }).click();
  await expect(page.getByText('Confirmed places need review again')).toBeVisible();
  await expect(page.getByText('Rhea Dimaano (demo)')).toBeVisible();
  await page.getByRole('button', { name: 'Review and save material changes' }).click();
  await expect(page.getByRole('status')).toContainText('Opportunity details saved.');
  let savedState = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data);
  expect(savedState.referrals.find((item: { id: string }) => item.id === 'ref-0001').state).toBe('accepted');
  expect(savedState.referrals.find((item: { id: string }) => item.id === 'ref-0004').state).toBe('accepted');

  await page.getByLabel('Capacity').fill('1');
  await page.getByRole('button', { name: 'Save draft details' }).click();
  await expect(page.getByRole('alert')).toContainText('2 places are already in use');
  await page.getByRole('button', { name: 'Cancel opportunity' }).click();
  await page.getByLabel('Reason for cancellation').fill('The fictional venue is unavailable.');
  await page.getByRole('button', { name: 'Review cancellation' }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirm opportunity cancellation' });
  await expect(dialog).toContainText('Rhea Dimaano (demo)');
  await dialog.getByRole('button', { name: 'Confirm cancellation' }).click();
  savedState = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data);
  expect(savedState.opportunities.find((item: { id: string }) => item.id === 'opp-clinic').state).toBe('cancelled');
  expect(savedState.referrals.find((item: { id: string }) => item.id === 'ref-0001').state).toBe('cancelled');
  expect(savedState.referrals.find((item: { id: string }) => item.id === 'ref-0006').state).toBe('did_not_attend');
  expect(savedState.referrals.find((item: { id: string }) => item.id === 'ref-0007').state).toBe('awaiting_follow_up');
  await page.goto('./#/opportunities/opp-clinic');
  await expect(page.getByText('The fictional venue is unavailable.', { exact: true })).toBeVisible();
});

test('closing warns about accepted but unconfirmed referrals by name', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    const referral = saved.state.data.referrals.find((item: { id: string }) => item.id === 'ref-0004');
    referral.opportunityId = 'opp-clinic';
    referral.state = 'accepted';
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  await page.goto('./#/council/opportunities/opp-clinic/edit');
  await expect(page.getByText(/accepted but do not yet have confirmed places: Rhea Dimaano/)).toBeVisible();
  await page.getByRole('button', { name: 'Close opportunity' }).click();
  const dialog = page.getByRole('dialog', { name: 'Close this opportunity?' });
  await expect(dialog).toContainText('Rhea Dimaano (demo)');
  await dialog.getByRole('button', { name: 'Close opportunity' }).click();
  await page.goto('./#/council/referrals/opp-clinic');
  const accepted = page.locator('article.readback-group').filter({ hasText: 'Rhea Dimaano (demo)' });
  await expect(accepted.getByText(/Confirmation is blocked because this opportunity is closed/)).toBeVisible();
});

test('P05 interest becomes a single referral and council invitation reuses that record', async ({ page }) => {
  await choosePersona(page, 'Noel (fictional filmmaker, verified)');
  await page.goto('./#/opportunities/opp-clinic');
  await page.getByRole('button', { name: 'Express interest' }).click();
  await expect(page.getByText('Your interest is recorded in this demo and is waiting for council review.')).toBeVisible();
  await expect(page.getByText(/Interest sent — waiting for council review/)).toBeVisible();
  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council/referrals/opp-clinic');
  const noelCandidate = page.getByRole('listitem').filter({ hasText: 'Noel' });
  await noelCandidate.getByRole('button', { name: 'Invite after interest' }).click();
  const pair = await page.evaluate(() => {
    const data = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data;
    return data.referrals.filter((item: { recordId: string; opportunityId: string }) => item.recordId === 'rec-noel' && item.opportunityId === 'opp-clinic');
  });
  expect(pair).toHaveLength(1);
  expect(pair[0]).toMatchObject({ origin: 'interest', state: 'offered' });
});

test('private verified creative can be invited, accept by coordinator relay, get confirmed, and receive an outcome', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    saved.state.data.records.find((record: { id: string }) => record.id === 'rec-joel').personId = 'person-mika';
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  await page.goto('./#/council/referrals/opp-clinic');
  const joelCandidate = page.getByRole('listitem').filter({ hasText: 'Joel Tan (demo)' });
  await expect(joelCandidate).toContainText('Not listed publicly');
  await joelCandidate.getByRole('button', { name: 'Invite creative' }).click();
  const referralId = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data.referrals.find((item: { recordId: string; opportunityId: string }) => item.recordId === 'rec-joel' && item.opportunityId === 'opp-clinic').id);

  await choosePersona(page, 'Coordinator — Demo Site A');
  await page.goto('./#/coordinator/records/rec-joel');
  await page.getByLabel('The person told me they agree with this response.').check();
  await page.getByRole('button', { name: 'Relay response' }).click();
  await expect(page.getByRole('status')).toContainText('acceptance was relayed');
  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council/referrals/opp-clinic');
  const joelReferral = page.locator('article.readback-group').filter({ hasText: 'Joel Tan (demo)' });
  await joelReferral.getByRole('button', { name: 'Confirm place' }).click();
  await joelReferral.getByLabel('Record outcome').selectOption('completed');
  await joelReferral.getByRole('button', { name: 'Record outcome' }).click();
  await expect(page.getByRole('status')).toContainText('Outcome recorded.');

  await choosePersona(page, 'Coordinator — Demo Site A');
  await page.goto('./#/coordinator/records/rec-joel');
  await page.getByLabel('Reason the person gives').fill('The person says the attendance record should be checked.');
  await page.getByLabel('The person agreed to this exact outcome-correction request.').check();
  await page.getByLabel('Reason the person gives').fill('The person changed the request details.');
  await expect(page.getByLabel('The person agreed to this exact outcome-correction request.')).not.toBeChecked();
  await page.getByLabel('Reason the person gives').fill('The person says the attendance record should be checked.');
  await page.getByLabel('The person agreed to this exact outcome-correction request.').check();
  await page.getByRole('button', { name: 'Request outcome correction' }).click();
  await expect(page.getByText('Outcome-correction request sent to the council.')).toBeVisible();
  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council?tab=cases');
  await page.getByRole('link', { name: 'Review outcome request' }).click();
  const outcomeCase = page.getByRole('heading', { name: 'Outcome correction request' }).locator('..');
  await outcomeCase.getByLabel('Council decision').selectOption('keep');
  await outcomeCase.getByLabel('Reason for decision').fill('Attendance was recorded from the fictional register.');
  await outcomeCase.getByRole('button', { name: 'Resolve outcome request' }).click();
  await choosePersona(page, 'Mika (fictional illustrator)');
  await page.goto(`./#/me/referrals/${referralId}`);
  await expect(page.getByText('Attended / completed (support received)', { exact: true })).toBeVisible();
  await expect(page.getByText('Attendance was recorded from the fictional register.', { exact: true })).toBeVisible();
  await page.goto('./#/directory');
  await expect(page.getByRole('link', { name: 'Joel Tan (demo)' })).toHaveCount(0);
});

test('creative accepts, withdraws with a reason, and can ask the council to correct an outcome', async ({ page }) => {
  await choosePersona(page, 'Rhea (fictional designer, verified)');
  await page.goto('./#/me/referrals/ref-0004');
  await page.getByLabel('I have reviewed the offer details and want to respond.').check();
  await page.getByRole('button', { name: 'Accept offer' }).click();
  await expect(page.getByText('The council must confirm capacity and arrangements before your place is set.')).toBeVisible();

  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council/referrals/opp-film');
  const rheaReferral = page.locator('article.readback-group').filter({ hasText: 'Rhea Dimaano (demo)' });
  await rheaReferral.getByRole('button', { name: 'Confirm place' }).click();
  await choosePersona(page, 'Rhea (fictional designer, verified)');
  await page.goto('./#/me/referrals/ref-0004');
  await page.getByLabel('Reason for withdrawing').fill('I cannot attend this session.');
  await page.getByRole('button', { name: 'Withdraw from this opportunity' }).click();
  await expect(page.getByText('This referral was cancelled. See the reason below.')).toBeVisible();
  await expect(page.getByText('I cannot attend this session.', { exact: true })).toBeVisible();

  await page.goto('./#/me/referrals/ref-0007');
  await page.getByLabel('What needs correcting?').fill('Please check whether I attended the digital session.');
  await page.getByRole('button', { name: 'Request outcome correction' }).click();
  await expect(page.getByText('Outcome correction request sent to the council.')).toBeVisible();
  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council/referrals/opp-digital');
  await expect(page.getByRole('heading', { name: 'Outcome correction request' })).toBeVisible();
  await page.getByLabel('Record follow-up outcome').selectOption('completed');
  const resolution = page.locator('.notice-warning').filter({ has: page.getByRole('heading', { name: 'Outcome correction request' }) });
  await expect(resolution.getByLabel('Council decision')).toHaveValue('');
  await resolution.getByLabel('Council decision').selectOption('completed');
  await resolution.getByLabel('Reason for decision').fill('The fictional attendance sheet confirms participation.');
  await resolution.getByRole('button', { name: 'Resolve outcome request' }).click();
  await choosePersona(page, 'Rhea (fictional designer, verified)');
  await page.goto('./#/me/referrals/ref-0007');
  await expect(page.getByText('The fictional attendance sheet confirms participation.', { exact: true })).toBeVisible();

  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council/referrals/opp-film');
  const noelInterest = page.locator('article.readback-group').filter({ hasText: 'Noel' });
  await noelInterest.getByRole('button', { name: 'Offer place' }).click();
  await choosePersona(page, 'Noel (fictional filmmaker, verified)');
  await page.goto('./#/me/referrals/ref-0003');
  await page.getByLabel('I have reviewed the offer details and want to respond.').check();
  await page.getByRole('button', { name: 'Decline offer' }).click();
  await expect(page.getByText('You declined this offer. This does not affect your membership.')).toBeVisible();
});

test('M03, M04, M05, and C03 are role guarded, accessible, and fit 320px and 1280px', async ({ page }) => {
  await page.goto('./#/council/opportunities');
  await expect(page.getByRole('link', { name: 'New opportunity' })).toBeVisible();
  await page.goto('./#/council/referrals/opp-clinic');
  const daniReferral = page.locator('#instructions-ref-0001').locator('xpath=ancestor::article');
  await daniReferral.getByRole('button', { name: 'Save instructions' }).click();
  await expect(daniReferral.locator('#instructions-ref-0001')).toBeFocused();
  await page.goto('./#/council/referrals/opp-film');
  const noelInterest = page.locator('#not-selected-ref-0003').locator('xpath=ancestor::article');
  await noelInterest.getByRole('button', { name: 'Not selected' }).click();
  await expect(noelInterest.locator('#not-selected-ref-0003')).toBeFocused();
  await choosePersona(page, 'Guest visitor');
  await page.goto('./#/me/referrals');
  await expect(page.getByRole('heading', { name: 'This view is not available in the current role' })).toBeVisible();
  await choosePersona(page, 'Council administrator (fictional)');
  await page.goto('./#/council/opportunities');
  await choosePersona(page, 'Rhea (fictional designer, verified)');
  await page.goto('./#/council/referrals/opp-clinic');
  await expect(page.getByRole('heading', { name: 'This view is not available in the current role' })).toBeVisible();

  await choosePersona(page, 'Council administrator (fictional)');
  const routes = ['./#/council/opportunities', './#/council/opportunities/opp-clinic/edit', './#/council/referrals/opp-clinic'];
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    for (const route of routes) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} at ${width}px`).toBeLessThanOrEqual(0);
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
      expect(scan.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical').map((item) => item.id)).toEqual([]);
    }
  }
  await choosePersona(page, 'Rhea (fictional designer, verified)');
  for (const route of ['./#/me/referrals', './#/me/referrals/ref-0004']) {
    await page.goto(route);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(scan.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical').map((item) => item.id)).toEqual([]);
  }
});
