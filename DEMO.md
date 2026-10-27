# Creative Connect Zamboanga — demonstration script

This is a browser-only concept prototype. Every person, site, provider, contact route, opportunity, and outcome is fictional. Sign-in, codes, connectivity, device queues, council decisions, invitations, and notifications are simulated in one browser. It is not an official council service, a business permit, a certification, or a promise of work. Nothing is sent to anyone.

The click paths below match the automated journey tests in `tests/e2e/journeys.spec.ts`. If the screens change, change this script to match the working prototype.

## Before you present

### Pre-demo checklist

1. Open the prototype in one browser tab. Use a desktop-width window (1280 px or wider) so the council list and detail sit side by side. A narrow window works for the assisted intake, shown separately.
2. Set browser zoom to 100%.
3. Open **Demo controls — not part of the service** (the dashed bar at the top; it is collapsed by default) and choose **Reset demo data**, then **Reset demo data** in the dialog. Reset restores the starting fictional records, opportunities, audit history, and counts.
4. In the same bar, confirm **Connection: online (simulated)** and **Next send: normal (simulated)**. The main story changes both on purpose.
5. Keep this script open. If the demonstration starts from an unexpected state, reset rather than explain what happened.

Browser storage must be allowed. If it is blocked, the prototype still runs, but progress is lost on reload.

### Presenter-laptop checklist

Use the laptop that will present. Checks on another machine do not certify it.

1. Install Node.js 22.12 or later and copy the repository folder to the laptop.
2. In the repository folder run `npm ci`, then `npm run build`. Do this before the event, while the internet is available.
3. Run `npm run preview` and open the local URL it prints. The build loads only local files; no council service or internet API is needed.
4. Rehearse the main and alternate stories after Reset. Note the time you actually take.
5. Have someone who did not build the app follow this script, and record the result in the handoff table at the end.

## Main story — Mika, assisted and private (target: about 6–7 minutes narrated — a script target, not a timed rehearsal)

Narrate the core path. Steps marked *(optional)* can be skipped if time is short; the core path still shows the queue, the retry, the correction, verification, the clinic offer, confirmation, and attendance.

### 1. Assisted draft and the offline queue

1. **Persona:** choose **Coordinator — Demo Site A**. In **Your drafts**, choose **Resume draft** for **Mika (demo)**. This is the existing assisted draft, not a new registration.
2. Choose **Continue to creative practice**. Point out **Visual Arts**, the specific illustration practice, the skills, and **General location** (Area 2, fictional).
3. Choose **Continue to work evidence**. Point out the description supplied in person. Choose **Review and privacy choices**.
4. Leave **I want to be considered for the public directory** unchecked. Check **I understand what information is collected and how it is used.** Say that the listing choice is separate from support.
5. In **Demo controls**, choose **Connection: online (simulated)** so it reads offline. Choose **Submit application**.
6. Point to **Queued on this device — the council has not received it** and the device reference (`DEV-A-…`). Choose **Return to the coordinator workspace**.
7. *(optional)* **Persona:** choose **Council administrator (fictional)**. On **Overview and queue**, point out that **New applications** still reads **1 of 9** received records. Choose **Coordinator — Demo Site A** again.

### 2. Simulated failure, retry, and one council record

8. In **Demo controls**, choose **Connection: offline (simulated)** so it reads online. Choose **Next send: normal (simulated)** so it reads **will fail**.
9. In the coordinator workspace, choose **Sync now**. Point out **Sending failed. Nothing was received; retry this item when connected.** and the card status **Sending failed — retry when connected**.
10. On **Mika (demo)**, choose **Retry**. The message reads **This item was received by the council.** Choose **Open the same record** and note the **CCZ** reference. The failure setting returns to normal after one failure.

### 3. Council asks for clarification

11. **Persona:** choose **Council administrator (fictional)**. On **Overview and queue**, the **New** tab lists **CCZ-… · Mika (demo)**. Open it.
12. Choose **Start review**. In **Council reason for changes or decline**, enter exactly:
    > Work evidence: please add a short description of the illustration process (fictional).
13. Choose **Request changes**. The status reads **Changes requested — see reason**.

### 4. Coordinator corrects the same record

14. **Persona:** choose **Coordinator — Demo Site A**. In **Search existing records before adding**, enter `Mika` and choose **Search assigned records**. Open **Mika (demo)** from the results.
15. Point to the **Current council request** notice with the exact reason. Choose **Help correct**.
16. Choose **Continue to creative practice**, then **Continue to work evidence**. In **Description or link text**, add a sentence about the illustration process (fictional). Choose **Review and privacy choices**, then **Submit application**.
17. The receipt reads **Received by the council** with the **same** CCZ reference.

### 5. Council verifies; Mika stays private

18. **Persona:** choose **Council administrator (fictional)**. Choose the **Resubmitted** tab, open **Mika (demo)**, choose **Start review**, then **Approve membership**. The status reads **Verified member (council checks passed — not a quality rating)**. **Listing choice: Opted out.**
19. *(optional)* **Persona:** choose **Guest visitor**. Choose **Directory** and search `Mika`. The result reads **No listed creatives match**. Mika is verified but not listed.

### 6. Invitation, claim, and the clinic offer

20. **Persona:** choose **Coordinator — Demo Site A**. Open **Mika (demo)** from the search, then choose **Send account invitation**. Note the code in the message (`INV-…`).
21. **Persona:** choose **Guest visitor**. Choose **Join or sign in**, then **Claim an invited record**.
22. Choose **Mika (fictional illustrator)** under **Fictional creative account**. In **Invitation code**, **replace** the pre-filled `INV-DEMO-DANI` with the code from step 20. Choose **Link existing record**. Mika's home shows the same CCZ reference and **Verified member**. Claiming links this record; it does not create another.
23. **Persona:** choose **Council administrator (fictional)**. Choose **Referrals**, then **Portfolio Feedback Clinic (fictional)**. Under **Find verified creatives**, find **Mika (demo)** and choose **Invite creative**. The offer does not reserve a place.
24. **Persona:** choose **Coordinator — Demo Site A**. Open Mika and check **The person told me they agree with this response.** Choose **Relay response**. The message says the acceptance was relayed and recorded with coordinator assistance.

### 7. Confirmation and attendance

25. **Persona:** choose **Council administrator (fictional)**. Open **Referrals** → **Portfolio Feedback Clinic (fictional)**. In Mika's row, enter **Practical instructions for confirmation**, such as `Arrive at the fictional Demo Site A hall 15 minutes early.` Choose **Confirm place**. The message reads **Place confirmed.**
26. In Mika's row, choose **Attended / completed** under **Record outcome**, then choose **Record outcome**. The message reads **Outcome recorded.** Say that this simulates a fictional attendance record, not a real event. It records support received, not paid work.

### 8. Matching records across roles

27. **Persona:** choose **Mika (fictional illustrator)**, choose **My referrals**, then open the clinic. Show **Attended / completed (support received)** and **Recorded with coordinator assistance.** in the history.
28. *(optional)* **Persona:** choose **Coordinator — Demo Site A** and open Mika. Show the same CCZ reference, **Verified member**, the attended status, and **With coordinator assistance (coord-a).** in the timeline.
29. **Persona:** choose **Council administrator (fictional)**. On **Overview and queue**, point to the label **Synthetic demo data — not real results**. Compare with the start: verified members rise by one; the cumulative "Place confirmed" and "Attended or completed" stages each rise by one; the **current** "Place confirmed" count is unchanged because the place has moved on to attendance. Explain the difference between current totals and cumulative stages.
30. Finish: **Persona:** choose **Guest visitor**. Search `Mika` in the directory. She is absent. If her profile link is opened directly, the page reads **This profile is not publicly listed**, the same answer as for an unknown profile.

## Alternate story — Jun, self-service and public (about 1–2 minutes narrated)

Start from **Reset**. The alternate story does not depend on the main story. Target narration: 1–2 minutes. This is a script target, not a timed rehearsal.

1. **Persona:** Guest visitor. Choose **Opportunities**, open **Portfolio Feedback Clinic (fictional)**, and choose **Register to take part**.
2. In **Demo contact**, enter `jun@demo.invalid`. Choose **Continue to simulated verification**. Enter the simulated code `000000`, then choose **Complete demo verification and continue**. Nothing is sent.
3. Enter **Name for the council record** `Jun Maker (fictional)` and **Display name** `Jun Maker (demo)`. Choose **Continue to creative practice**.
4. Choose **Creative domain** *Audiovisual Media*. Enter **Specific creative practice** `Short documentary editing (fictional)`. Choose **General location** *Area 3*. Choose **Continue to work evidence**.
5. Choose **Add a work example**. Enter `A short editing sample (fictional)` and check **OK to show publicly if I choose a public listing**. Add a second example, `Private process notes (fictional)`, and leave its public box unchecked.
6. Choose **Review and privacy choices**. Leave **I want to be considered for the public directory** unchecked. Check the information-use acknowledgment, then choose **Submit application**. The receipt reads **Received by the council**.
7. **Persona:** choose **Council administrator (fictional)**. Open **Jun Maker (demo)** from **New**. Choose **Start review**, then **Approve membership**. The status reads **Verified member**; the listing is still off.
8. **Persona:** choose **Jun (fictional video editor)**. Choose **Profile** and check **I want my profile considered for the public directory**. The status reads **Listed in directory**.
9. **Persona:** choose **Guest visitor**. Choose **Directory**, search `Jun Maker`, and open **Jun Maker (demo)**. Point out **Ask the council about this creative** and the placeholder council route. Point out that only the example marked for public display appears; the private note, the contact label, and the name kept for the council record are absent.
10. **Persona:** choose **Jun (fictional video editor)**. Choose **Profile** and uncheck the listing. The message reads **Your profile is no longer listed.** Choose **Home**: Jun is still a **Verified member**.
11. **Persona:** choose **Guest visitor**. Search `Jun Maker` in the directory. It reads **No listed creatives match**.

## What is simulated (talking points)

- **Sign-in and personas.** Choosing a persona changes the demo session. No password, code, or account is checked or sent. The role views are rules in the prototype, not security.
- **Connection and the device queue.** Offline, a coordinator's submission waits on that device. The council does not see it until the simulated send succeeds. A failed send does not create a second record.
- **Verification codes and invitations.** Codes and invitation codes are fictional. Nothing is sent to a contact.
- **Notifications.** Every notification is an in-app example. The label reads **In-app example — no SMS or email is sent**.
- **Council reporting.** The overview is generated from the fictional records and is labeled **Synthetic demo data — not real results**. It is not evidence of impact, income, or paid work.
- **Support, not work.** Opportunities, referrals, and attendance record support received. Accepting an offer is not a confirmed place; a confirmed place is not paid work or income.
- **Public listing.** Verification and listing are separate. A profile appears in the directory only when it is verified, opted in, and its public content is approved.
- **Council contact.** The contact route is a labeled placeholder. The council has not approved a real route.

## Exception paths (available if asked)

Each row is covered by an automated test in `tests/e2e/`.

| Exception | Behaviour shown | Covered by |
|---|---|---|
| Decline and human review | Declined with a reason; the creative requests a person; council reopens, then upholds | `journeys.spec.ts` decline and human review |
| Possible duplicate | Approval blocked until resolved as not a duplicate | `journeys.spec.ts` duplicate resolution; `council-profile.spec.ts` linked duplicate |
| Conflict in the device queue | Compare, resubmit against the current version, or discard | `coordinator.spec.ts` conflict view; `journeys.spec.ts` conflict resolution |
| Send failure | Failed send keeps the item on the device; retry sends one record | `journeys.spec.ts` main story |
| Full capacity | Confirmation blocked with an explanation | `journeys.spec.ts` capacity full |
| Cancellation | Active referrals cancelled with the reason; recorded outcomes kept | `opportunities.spec.ts` material edits and cancellation |
| Outcome correction | Creative asks; council decides on the same referral | `opportunities.spec.ts` outcome correction tests |
| Visibility withdrawal | Listing removed at once; verified membership kept | `journeys.spec.ts` alternate story; `council-profile.spec.ts` |
| Direct-URL denial | Guest and the other site's coordinator see the access panel, not the record | `journeys.spec.ts` direct URLs; `shell.spec.ts`; `coordinator.spec.ts` |
| Reload and Reset | Reload keeps progress; Reset restores the baseline counts | `journeys.spec.ts` main story and reload/Reset test |

## Handoff record

Record each independent rehearsal here. Leave a row blank until that rehearsal has actually happened.

| Who | Date | Machine | Browser | Result | Corrections |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
|  |  |  |  |  |  |
