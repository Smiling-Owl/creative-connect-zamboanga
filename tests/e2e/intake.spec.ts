import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function tabUntil(page: Page, target: Locator, limit = 40) {
  for (let step = 0; step < limit; step += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Keyboard focus did not reach the requested control.');
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('self-service intake saves each step, validates consent, submits once, and restores the receipt', async ({ page }) => {
  await page.goto('./#/access?mode=signin');
  await page.getByRole('button', { name: 'Jun (fictional video editor)' }).click();
  await page.goto('./#/apply');
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();
  await page.getByLabel('Name for the council record').fill('Jun Maker (fictional)');
  await page.getByLabel('Display name').fill('Jun Maker (demo)');
  await page.getByRole('button', { name: 'Continue to creative practice' }).click();
  await page.getByLabel('Creative practice').selectOption('Film / video production');
  await page.getByLabel('Skills').press('Control+A');
  await page.getByLabel('Skills').pressSequentially('Editing, Storyboarding', { delay: 5 });
  await page.getByLabel('Broad area').selectOption('Area 3 (broad, fictional)');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Creative practice' })).toBeVisible();
  await expect(page.getByLabel('Skills')).toHaveValue('Editing, Storyboarding');
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await expect(page.getByText('A polished portfolio or business permit is not required.')).toBeVisible();
  await page.getByRole('button', { name: 'Add a work example' }).click();
  await page.getByLabel('Description or link text').fill('A short editing sample (fictional)');
  await page.getByLabel('OK to show publicly if I choose a public listing').check();
  await page.getByRole('button', { name: 'Add a work example' }).click();
  await page.getByLabel('Description or link text').nth(1).fill('Private process notes (fictional)');
  const saved = await page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state;
    return state.data.drafts.find((draft: { ownerId: string; recordId: string | null }) => draft.ownerId === 'person-jun' && draft.recordId === null)?.fields;
  });
  expect(saved).toMatchObject({
    name: 'Jun Maker (fictional)',
    displayName: 'Jun Maker (demo)',
    practice: 'Film / video production',
    skills: ['Editing', 'Storyboarding'],
    area: 'Area 3 (broad, fictional)',
    followUp: { kind: 'own_channel', channelLabel: 'Demo contact: Jun (fictional)' },
    evidence: [
      { text: 'A short editing sample (fictional)', publicApproved: true },
      { text: 'Private process notes (fictional)', publicApproved: false },
    ],
  });
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await expect(page.getByRole('heading', { name: 'Check your information' })).toBeVisible();
  await expect(page.getByText('Editing, Storyboarding')).toBeVisible();
  const publicPreview = page.locator('article').filter({ hasText: 'Draft preview · not publicly listed' });
  await expect(publicPreview.getByText('A short editing sample (fictional)')).toBeVisible();
  await expect(publicPreview.getByText('Jun Maker (fictional)')).toHaveCount(0);
  await expect(publicPreview.getByText('Demo contact: Jun (fictional)')).toHaveCount(0);
  await expect(publicPreview.getByText('Private process notes (fictional)')).toHaveCount(0);
  await expect(publicPreview.getByText('A short editing sample (fictional)')).toBeVisible();
  await expect(page.getByLabel('I want to be considered for the public directory')).not.toBeChecked();
  await page.getByRole('heading', { name: 'Creative practice' }).getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Creative practice' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await expect(page.getByRole('heading', { name: 'Work evidence' })).toBeVisible();
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await expect(page.getByRole('heading', { name: 'Check your information' })).toBeVisible();
  const submittedDraftId = await page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state;
    return state.data.drafts.find((draft: { ownerId: string; recordId: string | null }) => draft.ownerId === 'person-jun' && draft.recordId === null)?.id;
  });
  expect(submittedDraftId).toBeTruthy();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.locator('.intake-error-summary')).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Check the information before submitting' })).toBeVisible();
  await expect(page.getByText('Confirm the information-use notice before sending.')).toBeVisible();
  await page.getByLabel('I understand what information is collected and how it is used.').check();
  await page.getByRole('button', { name: 'Submit application' }).dblclick();
  await expect(page.getByText('Received by the council', { exact: false })).toBeVisible();
  const submittedRecords = await page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state;
    return state.data.records.filter((record: { personId: string }) => record.personId === 'person-jun').map((record: { application: { reference: string } }) => record.application.reference);
  });
  expect(submittedRecords).toEqual([expect.any(String)]);
  const referenceText = await page.locator('text=/CCZ-\\d{4}/').innerText();
  const reference = referenceText.match(/CCZ-\d{4}/)?.[0] ?? '';
  expect(reference).not.toBe('');
  expect(submittedRecords[0]).toBe(reference);
  await expect(page.getByText(reference)).toBeVisible();
  await page.reload();
  await expect(page.getByText(reference, { exact: false }).first()).toBeVisible();
  await page.goto('./#/me');
  await expect(page.getByText(reference, { exact: false }).first()).toBeVisible();
  await page.locator('.demo-bar details summary').click();
  await page.getByLabel('Persona').selectOption({ label: 'Coordinator — Demo Site A' });
  await page.goto(`./#/apply/review?draftId=${encodeURIComponent(submittedDraftId ?? '')}`);
  await expect(page.getByText('This draft is not available in this account.')).toBeVisible();
  await expect(page.getByText(reference, { exact: false })).toHaveCount(0);
  await expect(page.getByText('Received by the council', { exact: false })).toHaveCount(0);
  await page.goto(`./#/apply?draftId=${encodeURIComponent(submittedDraftId ?? '')}`);
  await expect(page.getByText('This draft is not available in this account.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'About you' })).toHaveCount(0);
});

test('a requested correction reuses its record and applies the new directory choice', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    saved.state.personaId = 'jun';
    const record = saved.state.data.records.find((item: { id: string }) => item.id === 'rec-gwen');
    record.personId = 'person-jun';
    record.accountState = 'active';
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  await page.goto('./#/me');
  await expect(page.getByText('Please add one work sample description or link so the council can check your practice.').first()).toBeVisible();
  await page.getByRole('link', { name: 'Correct and resubmit' }).click();
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();
  await expect(page.getByLabel('Name for the council record')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Continue to creative practice' }).click();
  await expect(page.getByLabel('Creative practice')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await expect(page.getByText('Describe at least one piece of work evidence. A polished portfolio is not required.')).toBeVisible();
  await page.getByRole('button', { name: 'Add a work example' }).click();
  await page.getByLabel('Description or link text').fill('Added sample description for correction (fictional)');
  await expect(page.getByRole('button', { name: 'Review and privacy choices' })).toBeEnabled();
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await expect(page.getByLabel('I want to be considered for the public directory')).not.toBeChecked();
  await page.getByLabel('I want to be considered for the public directory').check();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText('Received by the council', { exact: false })).toBeVisible();
  const after = await page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state;
    return state.data.records.filter((record: { personId: string }) => record.personId === 'person-jun');
  });
  expect(after).toHaveLength(1);
  expect(after[0]).toMatchObject({ id: 'rec-gwen', optedIn: true, application: { reference: 'CCZ-0008', state: 'received' } });
  await page.goto('./#/apply?recordId=rec-gwen');
  await expect(page.getByText('Your record is already with the council. Use its status page to continue.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open your application status' })).toHaveAttribute('href', '#/me');
  await expect(page.getByRole('heading', { name: 'About you' })).toHaveCount(0);
});

test('a creative can request human review once and see the saved waiting request', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    saved.state.personaId = 'jun';
    const record = saved.state.data.records.find((item: { id: string }) => item.id === 'rec-lorenz');
    record.personId = 'person-jun';
    record.accountState = 'active';
    saved.state.data.cases = [];
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  await page.goto('./#/me');
  await expect(page.getByText('Declined — see reason; you can request a human review')).toBeVisible();
  await page.getByRole('button', { name: 'Request a human review' }).click();
  await page.getByLabel('Why should a person review this decision?').fill('Please consider the attached fictional description again.');
  await page.getByRole('button', { name: 'Send human-review request' }).click();
  await expect(page.getByText('Your request is waiting for the council: Please consider the attached fictional description again.')).toBeVisible();
  const caseCount = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.data.cases.length);
  expect(caseCount).toBe(1);
  await page.reload();
  await page.goto('./#/me');
  await expect(page.getByText('Your request is waiting for the council: Please consider the attached fictional description again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request a human review' })).toHaveCount(0);
});

test('assisted intake stays private in queue, and later drafts stay isolated across personas', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    saved.state.access.returnOpportunityId = 'opp-clinic';
    saved.state.access.returnOpportunityOwnerId = 'person-jun';
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  await page.locator('.demo-bar details summary').click();
  await page.getByLabel('Persona').selectOption({ label: 'Coordinator — Demo Site A' });
  await page.locator('.demo-bar details summary').click();
  await page.goto('./#/apply');
  await expect(page.getByText('The creative makes their own choices.')).toBeVisible();
  await expect(page.getByText('Demo Site A — barangay hall (fictional)')).toBeVisible();
  await expect(page.getByLabel('Coordinator-mediated follow-up')).toBeChecked();
  await expect(page.getByLabel('Fictional contact label')).toHaveCount(0);
  await expect(page.getByText(/You started from/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue to creative practice' }).click();
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await expect(page.getByLabel('I want to be considered for the public directory')).not.toBeChecked();
  await page.getByLabel('I understand what information is collected and how it is used.').check();
  await expect(page.getByText('Coordinator-assisted · Demo Site A — barangay hall (fictional) · coord-a · 2026-10-22')).toBeVisible();
  await page.locator('.demo-bar details summary').click();
  await page.getByRole('button', { name: 'Connection: online (simulated)' }).click();
  await page.locator('.demo-bar details summary').click();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText('Queued on this device — the council has not received it')).toBeVisible();
  const queuedState = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state);
  expect(queuedState.data.queue).toHaveLength(2); // One seeded item plus Mika's new waiting item.
  expect(queuedState.data.queue.some((item: { fields: { displayName: string }; status: string }) => item.fields.displayName === 'Mika (demo)' && item.status === 'waiting')).toBe(true);
  expect(queuedState.data.records.some((record: { intake: { displayName: string } }) => record.intake.displayName === 'Mika (demo)')).toBe(false);
  const mikaDeviceRef = queuedState.data.queue.find((item: { fields: { displayName: string } }) => item.fields.displayName === 'Mika (demo)').deviceRef;

  await page.locator('.demo-bar details summary').click();
  await page.getByLabel('Persona').selectOption({ label: 'Jun (fictional video editor)' });
  await page.goto('./#/apply/review?draftId=draft-mika');
  await expect(page.getByText('This draft is not available in this account.')).toBeVisible();
  await expect(page.getByText(mikaDeviceRef, { exact: false })).toHaveCount(0);
  await page.goto('./#/apply?draftId=draft-mika');
  await expect(page.getByText('This draft is not available in this account.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'About you' })).toHaveCount(0);
  await page.locator('.demo-bar details summary').click();
  await page.locator('.demo-bar details summary').click();
  await page.getByLabel('Persona').selectOption({ label: 'Coordinator — Demo Site A' });
  await page.locator('.demo-bar details summary').click();

  await page.goto('./#/apply');
  await expect(page.getByLabel('Name for the council record')).toHaveValue('');
  await expect(page.getByText('Queued on this device — the council has not received it')).toHaveCount(0);
  await page.getByLabel('Name for the council record').fill('Rosa (fictional)');
  await page.getByLabel('Display name').fill('Rosa (demo)');
  await page.getByRole('button', { name: 'Continue to creative practice' }).click();
  await page.getByLabel('Creative practice').selectOption('Illustration');
  await page.getByLabel('Skills').fill('Color study');
  await page.getByLabel('Broad area').selectOption('Area 2 (broad, fictional)');
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await page.getByRole('button', { name: 'Add a work example' }).click();
  await page.getByLabel('Description or link text').fill('Color study samples (fictional)');
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await page.getByLabel('I understand what information is collected and how it is used.').check();
  await page.locator('.demo-bar details summary').click();
  await page.getByRole('button', { name: 'Connection: offline (simulated)' }).click();
  await page.locator('.demo-bar details summary').click();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText('Received by the council', { exact: false })).toBeVisible();
  const rosaRecords = await page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state;
    return state.data.records.filter((record: { intake: { displayName: string } }) => record.intake.displayName === 'Rosa (demo)');
  });
  expect(rosaRecords).toHaveLength(1);
  expect(rosaRecords[0]).toMatchObject({ personId: null, optedIn: false, source: { mode: 'assisted', siteId: 'site-a', coordinatorId: 'coord-a' } });
  const originAfterCoordinatorSubmit = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state.access);
  expect(originAfterCoordinatorSubmit).toMatchObject({ returnOpportunityId: 'opp-clinic', returnOpportunityOwnerId: 'person-jun' });

  await page.goto('./#/apply');
  await expect(page.getByLabel('Name for the council record')).toHaveValue('');
  await expect(page.getByText('Received by the council', { exact: false })).toHaveCount(0);
  await page.locator('.demo-bar details summary').click();
  await page.getByLabel('Persona').selectOption({ label: 'Jun (fictional video editor)' });
  await page.locator('.demo-bar details summary').click();
  await page.locator('.demo-bar details summary').click();
  await page.getByRole('button', { name: 'Connection: online (simulated)' }).click();
  await page.locator('.demo-bar details summary').click();
  await page.goto('./#/apply');
  await expect(page.getByLabel('Name for the council record')).toHaveValue('Jun (fictional)');
  await expect(page.getByText(/You started from Portfolio Feedback Clinic/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to the opportunity you started from' })).toHaveAttribute('href', '#/opportunities/opp-clinic');
  await expect(page.getByText('Mika (fictional)')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue to creative practice' }).click();
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await page.getByRole('button', { name: 'Add a work example' }).click();
  await page.getByLabel('Description or link text').fill('Private offline sample (fictional)');
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await page.getByLabel('I understand what information is collected and how it is used.').check();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText('You are offline, so this cannot be sent yet. Your draft is saved on this device.')).toBeVisible();
  const finalState = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state);
  expect(finalState.data.queue.filter((item: { fields: { displayName: string } }) => item.fields.displayName === 'Jun (demo)')).toHaveLength(0);
  expect(finalState.data.records.filter((record: { personId: string }) => record.personId === 'person-jun')).toHaveLength(0);
  expect(finalState.data.drafts.some((draft: { ownerId: string; fields: { displayName: string } }) => draft.ownerId === 'person-jun' && draft.fields.displayName === 'Jun (demo)')).toBe(true);
});

test('an opportunity signup returns after the intake is received', async ({ page }) => {
  await page.goto('./#/opportunities/opp-clinic');
  await page.getByRole('link', { name: 'Register to take part' }).click();
  await page.getByRole('button', { name: 'Continue to simulated verification' }).click();
  await page.getByLabel('Simulated code').fill('000000');
  await page.getByRole('button', { name: 'Complete demo verification and continue' }).click();
  await expect(page.getByText('You started from Portfolio Feedback Clinic')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to the opportunity you started from' })).toHaveAttribute('href', '#/opportunities/opp-clinic');
  await page.getByRole('button', { name: 'Continue to creative practice' }).click();
  await page.getByLabel('Skills').press('Control+A');
  await page.getByLabel('Skills').fill('Video editing');
  await page.getByRole('button', { name: 'Continue to work evidence' }).click();
  await page.getByRole('button', { name: 'Add a work example' }).click();
  await page.getByLabel('Description or link text').fill('A video edit description (fictional)');
  await page.getByRole('button', { name: 'Review and privacy choices' }).click();
  await page.getByLabel('I understand what information is collected and how it is used.').check();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText('Received by the council', { exact: false })).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}').state);
  expect(state.data.records.filter((record: { personId: string }) => record.personId === 'person-jun')).toHaveLength(1);
  expect(state.access.returnOpportunityId).toBeNull();
  await page.getByRole('link', { name: 'Return to Portfolio Feedback Clinic' }).click();
  await expect(page.getByRole('heading', { name: 'Portfolio Feedback Clinic' })).toBeVisible();
});

test('intake steps stay accessible at narrow widths and can be submitted from the keyboard', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    saved.state.personaId = 'jun';
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto('./#/apply?step=1');
    await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();
    for (const step of ['About you', 'Creative practice', 'Work evidence']) {
      const findings = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
      const serious = findings.violations.filter((issue) => issue.impact === 'serious' || issue.impact === 'critical');
      expect(serious, `${width}px R01 ${step}: ${serious.map((issue) => issue.id).join(', ')}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      if (step === 'About you') await page.getByRole('button', { name: '2. Creative practice' }).click();
      if (step === 'Creative practice') await page.getByRole('button', { name: '3. Work evidence' }).click();
    }
    await page.goto('./#/apply/review?draftId=draft-jun');
    await expect(page.getByRole('heading', { name: 'Check your information' })).toBeVisible();
    let findings = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    let serious = findings.violations.filter((issue) => issue.impact === 'serious' || issue.impact === 'critical');
    expect(serious, `${width}px R02: ${serious.map((issue) => issue.id).join(', ')}`).toEqual([]);
    await page.getByRole('button', { name: 'Submit application' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.intake-error-summary')).toBeFocused();
    await page.goto('./#/me');
    findings = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    serious = findings.violations.filter((issue) => issue.impact === 'serious' || issue.impact === 'critical');
    expect(serious, `${width}px C01: ${serious.map((issue) => issue.id).join(', ')}`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  }
});

test('keyboard users can complete the intake and submit after correcting errors', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    saved.state.personaId = 'jun';
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });
  await page.reload();
  await page.goto('./#/apply');
  await page.getByLabel('Name for the council record').focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Keyboard Creative (fictional)');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Keyboard Creative (demo)');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const continuePractice = page.getByRole('button', { name: 'Continue to creative practice' });
  await expect(continuePractice).toBeFocused();
  await page.keyboard.press('Enter');

  const skills = page.getByLabel('Skills');
  await tabUntil(page, skills);
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Keyboard editing, Storyboarding');
  const continueEvidence = page.getByRole('button', { name: 'Continue to work evidence' });
  await tabUntil(page, continueEvidence);
  await page.keyboard.press('Enter');
  const evidenceIssue = page.getByRole('button', { name: /Describe at least one piece of work evidence/ });
  await tabUntil(page, evidenceIssue);
  await page.keyboard.press('Enter');
  await expect(page.locator('#intake-evidence')).toBeFocused();
  const addEvidence = page.getByRole('button', { name: 'Add a work example' });
  await tabUntil(page, addEvidence);
  await page.keyboard.press('Enter');
  const evidenceText = page.getByLabel('Description or link text');
  await tabUntil(page, evidenceText);
  await page.keyboard.type('A keyboard-entered fictional work sample');
  const review = page.getByRole('button', { name: 'Review and privacy choices' });
  await tabUntil(page, review);
  await page.keyboard.press('Enter');

  const submit = page.getByRole('button', { name: 'Submit application' });
  await tabUntil(page, submit);
  await page.keyboard.press('Enter');
  await expect(page.locator('.intake-error-summary')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  const acknowledgement = page.getByLabel('I understand what information is collected and how it is used.');
  await expect(acknowledgement).toBeFocused();
  await expect(page).toHaveURL(/#\/apply\/review\?draftId=draft-jun/);
  await page.keyboard.press('Space');
  await tabUntil(page, submit);
  await expect(submit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Received by the council', { exact: false })).toBeVisible();
});

test('C01 received, correction, and declined review states pass narrow accessibility checks', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
    saved.state.personaId = 'jun';
    const record = saved.state.data.records.find((item: { id: string }) => item.id === 'rec-gwen');
    record.personId = 'person-jun';
    record.accountState = 'active';
    window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
  });

  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 760 });
    for (const applicationState of ['received', 'changes_requested', 'declined'] as const) {
      await page.evaluate((nextState) => {
        const saved = JSON.parse(window.localStorage.getItem('ccz-demo:v1') ?? '{}');
        const record = saved.state.data.records.find((item: { id: string }) => item.id === 'rec-gwen');
        record.application.state = nextState;
        record.application.reason = nextState === 'declined' ? 'A fictional reason for a second look.' : nextState === 'changes_requested' ? 'Please add a sample description (fictional).' : null;
        saved.state.data.cases = nextState === 'declined' ? [{ id: 'case-demo', kind: 'human_review', recordId: record.id, referralId: null, state: 'open', reason: 'Please review this fictional decision.', resolution: null, openedBy: 'coord-a' }] : [];
        window.localStorage.setItem('ccz-demo:v1', JSON.stringify(saved));
      }, applicationState);
      await page.reload();
      await page.goto('./#/me');
      await expect(page.getByRole('heading', { name: applicationState === 'received' ? 'Waiting for council review' : applicationState === 'changes_requested' ? 'Correct the information you were asked about' : 'Review the decision' })).toBeVisible();
      if (applicationState === 'declined') await expect(page.getByText('Your request is waiting for the council: Please review this fictional decision.')).toBeVisible();
      const findings = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
      const serious = findings.violations.filter((issue) => issue.impact === 'serious' || issue.impact === 'critical');
      expect(serious, `${width}px C01 ${applicationState}: ${serious.map((issue) => issue.id).join(', ')}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    }
  }
});
