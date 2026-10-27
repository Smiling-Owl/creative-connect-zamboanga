# UI Context

UI is central to this project: the deliverable is a clickable prototype judged by how understandable its journeys are. Status markers: APPROVED / PROPOSED / OPEN as in `architecture-context.md`. Visual details below are PROPOSED unless stated.

## Product Feel

A calm, trustworthy public service that helps people, not a marketing site or a marketplace. Plain language, honest about limits, never promising work or certification. Every screen answers "where am I, what is the status, what happens next?". The prototype is visibly a prototype: a persistent but unobtrusive "Prototype · fictional data" marker in the product chrome.

## Visual Direction

- Working identity: text wordmark **Creative Connect Zamboanga** with the subtitle "Proposed service concept for the Zamboanga City Creative Council — not an official council site". No council logo, seal, or official colors (APPROVED: no unapproved branding).
- Warm off-white surfaces, dark ink text, one restrained accent for primary actions and links, and a separate semantic status palette. No hero imagery, stock photos, illustrations, or decorative gradients; work evidence is represented by text cards and simple placeholder tiles labeled "Sample (fictional)".
- No cultural motifs or invented local terminology.

## Creative classification and location labels

- R01 step 2 uses **Creative domain** (one of the nine RA 11904 domains) followed by **Specific creative practice** (free text, such as video editing). Domain examples help users choose; they are illustrative, not an approved sub-sector list.
- Carry domain and practice separately through saved drafts, review, the public preview, and listed profiles. Directory domain filters use the public projection only.
- Replace the visible label **Broad area** with **General location**. Explain: "Your barangay, district, or general area. Do not enter a street address." The current Area 1/2/3 options remain fictional demo values. Internal field name `area` is unchanged.

## Layout Principles

- Mobile-first single column (max content width ~42rem for forms/reading).
- Council area on ≥1024 px: list/detail split (queue on the left, selected case on the right); on narrow screens the list and detail are separate steps with a clear back link.
- One primary action per screen region; destructive or decision actions (decline, cancel, reset) are visually secondary and ask for a reason/confirmation.
- Status always appears near the top of a record (badge + plain sentence + next action), followed by a timeline.

## Navigation

APPROVED destinations per role (from the flow baseline):

| Role | Primary destinations |
|---|---|
| Guest | Directory · Opportunities · Guidance · Join / Sign in |
| Creative | Home · Opportunities · My referrals · Profile (guidance from home/menu) |
| Coordinator | Workspace · Add creative · Follow-ups (queue status visible in workspace) |
| Council | Overview / review queue · Creative records · Opportunities · Referrals |

- Header: wordmark, role-specific nav (collapses to a menu button under ~640 px), current persona name with role label.
- **Demo controls** sit outside the product chrome: a distinct, collapsible bar (dashed border, "Demo controls — not part of the service") with persona switch (Guest, Mika, Jun, Coordinator — Demo Site A, Coordinator — Demo Site B, Council admin), connectivity (Online/Offline), "Next send fails" toggle, and Reset (with confirmation). It must never cover content or controls at 320 px and must be fully keyboard operable.
- Skip link to main content; page `<title>` and `h1` update on every route change; focus moves to the `h1` after navigation.

### Screen map

| ID | View | Users | Main contents / actions |
|---|---|---|---|
| P01 | Welcome and program explanation | Everyone | Who it is for, benefits, limits (not a permit, not certification, no guaranteed work), how joining works, register, ask for assistance, entry to directory/opportunities |
| P02 | Creative directory | Everyone | Search; filter by creative domain, skill/practice, and general location; only listed profiles; no-results and clear-filters states |
| P03 | Public creative profile | Everyone | Display name, domain, specific practice, skills, general location, creator-approved evidence, last updated, "Ask the council about this creative" route; never contact details |
| P04 | Opportunities | Everyone | Published offers (closed/cancelled marked) with type, availability, deadline, eligibility summary; filters |
| P05 | Opportunity details | Everyone | Provider, eligibility, cost, capacity/availability, dates, location/mode, status, next step; role-aware action (register/get assistance, express interest, already-interested status, unavailable reason) |
| P06 | Support and guidance | Everyone | Example formalization/IP/support cards with source and last-reviewed date; "not legal advice, not a permit, not certification" |
| A01 | Account access and invitation claim | Everyone / invited staff | Variants: sign-in, sign-up, contact verification (simulated code), claim existing record, staff invitation acceptance; simulation notice |
| A02 | Access recovery | Account holders | Recovery via verified route (simulated), expired-link state, help via coordinator/council |
| R01 | Creative intake | Creative / coordinator | Basic details and follow-up arrangement; domain, free-text specific practice, skills, interests, general location, evidence (link, sample description, or assisted description); assisted mode adds source/site/coordinator; save draft; step progress |
| R02 | Review, privacy choices, submit | Creative / coordinator | Readback with edit links, information-use notice, separate public-listing choice (off by default) with public preview, submit; online result (received + reference) or queued result (local reference, "not received yet") |
| C01 | My home and application status | Creative | Next action card, status + timeline, reference, review reason, correct/resubmit, request human review, get assistance, notifications |
| C02 | My profile and preferences | Creative | Edit fields (marking which need re-review), public preview (same as P03), listing on/off, contact preference, last updated/refresh prompt, correction/withdrawal request |
| C03 | My opportunities and referrals | Creative | List of interests/offers and selected detail: accept/decline, confirmation and instructions, cancellations, outcome, outcome correction request |
| F01 | Coordinator workspace | Coordinator | Assigned records and drafts, device queue with per-item transfer state (waiting, sending, failed → retry, conflict, delivered), sync now, start assisted intake, search existing records first |
| F02 | Assisted record and follow-up | Assigned coordinator | Minimal assigned profile, source and permission readback, application/referral timeline, requested corrections, relay response (actor recorded), follow-up note, send account invitation |
| M01 | Council overview and review queue | Council | Queue tabs (new, resubmitted, cases: human review/correction/withdrawal), overdue markers, record search, synthetic counts/funnel, recent activity |
| M02 | Application review | Council | Full application and evidence, follow-up route check, public-content preview, duplicate panel, review history; start review, approve, request changes, decline (reason required) |
| M03 | Opportunity management | Council | Draft/published/closed/cancelled lists with referral and capacity counts; create/edit |
| M04 | Opportunity editor and preview | Council | All opportunity fields, live public preview (P05 component), publish, close, cancel with reason and affected-referral summary |
| M05 | Referral tracker and outcome detail | Council | Per-opportunity roster; find verified records by skill/interest/area (manual, no ranking); invite; review interest; offer/not selected; confirm (capacity shown); instructions; record outcome; correction cases; audit trail |

Reuse boundaries (APPROVED): R01/R02 serve both modes; C01 and F02 share timeline/correction components with different permissions; P05's detail component is reused in C03 and M05; C02's preview is the P03 component fed by the public projection; M01 is the only council dashboard. Validation errors, unsent queue, duplicate warnings, unavailable/expired offers, no results, empty referrals, and access denied are states or inline panels, not extra pages.

## Typography

- System font stack (no web-font download): `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`.
- Base 16 px (1rem), line height 1.5; never below 14 px for any text. Scale (rem): 0.875 · 1 · 1.125 · 1.375 · 1.75. Headings 600 weight; body 400.
- Sentence case labels; numbers with tabular figures in tables/counts.

## Spacing

4 px base; scale 4 · 8 · 12 · 16 · 24 · 32 · 48. Page gutter 16 px on mobile, 24 px on tablet+. Form fields separated by 16–24 px; related controls grouped with 8 px.

## Design Tokens

Defined once as CSS custom properties in `src/styles/tokens.css`. Exact values may be tuned, but contrast must stay ≥ 4.5:1 for text and ≥ 3:1 for UI boundaries/focus.

| Token | Purpose | Starting value |
|---|---|---|
| `--color-bg` | Page background | `#FAF8F5` |
| `--color-surface` | Cards, panels | `#FFFFFF` |
| `--color-ink` | Body text | `#1F2328` |
| `--color-ink-muted` | Secondary text | `#565E67` |
| `--color-border` | Dividers, inputs | `#8A939C` |
| `--color-accent` | Primary buttons, links | `#0F5C6E` |
| `--color-accent-ink` | Text on accent | `#FFFFFF` |
| `--color-focus` | Focus ring | `#B4530A` |
| `--color-status-info` / `-success` / `-warning` / `-danger` / `-neutral` | Status badges (always paired with text + icon/shape) | blue / green / amber / red / grey, each with a tinted background |
| `--color-demo` | Demo controls bar | distinct dashed outline color |
| `--radius` | Corners | `6px` |
| `--space-1…7` | Spacing scale | 4…48 px |
| `--tap-min` | Minimum target | `44px` |

No dark mode in this release (PROPOSED); colors must not depend on OS theme.

## Status Vocabulary

One user-facing label (and one plain sentence) per state, used identically in every role view. Badge tone in brackets.

| Domain state | Label | Tone |
|---|---|---|
| application `draft` | Draft — not submitted | neutral |
| `queued` (waiting) | Queued on this device — the council has not received it | warning |
| `queued` (failed) | Sending failed — retry when connected | danger |
| `queued` (conflict) | Needs attention — the council record changed | danger |
| `received` | Received by the council — reference shown | info |
| `under_review` | Under council review | info |
| `changes_requested` | Changes requested — see reason | warning |
| `declined` | Declined — see reason; you can request a human review | danger |
| `verified` | Verified member (council checks passed — not a quality rating) | success |
| flag `updatePending` | Update waiting for council review | warning |
| flag duplicate | Possible duplicate — council must resolve | warning |
| listing | Not listed (private) · Listing pending review · Listed in directory | neutral / warning / success |
| opportunity | Draft · Open (published) · Closed · Cancelled | neutral / success / neutral / danger |
| referral `interest` | Interest sent — waiting for council review | info |
| `under_review` | Council reviewing suitability | info |
| `offered` | Place offered — please respond | warning |
| `not_selected` | Not selected this time | neutral |
| `accepted` | Accepted — waiting for council confirmation | info |
| `declined` | You declined this offer | neutral |
| `confirmed` | Place confirmed — see instructions | success |
| `completed` | Attended / completed (support received) | success |
| `did_not_attend` | Did not attend | neutral |
| `awaiting_follow_up` | Awaiting follow-up | warning |
| `cancelled` | Cancelled — see reason | danger |

Copy rules: never "approved for work", "hired", "paid", "income", "certified", "guaranteed", or "official"; say "simulated" wherever an action would involve real credentials, devices, or messages; notifications read "In-app example — no SMS or email is sent".

## Components / Reuse Principles

Build a small shared set before views: app shell and nav, demo controls, page header with status, status badge, status timeline, next-action card, form field (label, hint, error, required marker), choice group, stepper, record list/queue row, list/detail layout, profile card (public projection), opportunity detail, referral detail with actions, review action panel with required reason, confirmation dialog, inline notice (info/warning/error/simulation), empty state, access-not-available panel. Prefer composition over configuration flags; do not build a generic component library.

## Responsive Behavior

- Must work without horizontal scroll or clipped controls at 320 px, 360 px, 768 px (tablet), and ≥1280 px (desktop).
- Tables become stacked rows/cards below 640 px; long references and names wrap.
- Sticky elements (header, demo bar) must not consume more than ~20% of a 320×568 viewport; the demo bar collapses to a single button.
- Intake and coordinator views are designed at 360 px first; council review is designed at 1280 px first and degrades to stacked steps.

## Accessibility

Target WCAG 2.2 AA. Semantic landmarks and headings; every input has a visible label and programmatic association; hints and errors tied with `aria-describedby`; error summary at top of forms linking to fields; status changes announced via a polite live region; dialogs trap and restore focus; visible focus ring on every interactive element; ~44 px targets; color never the only status signal; `prefers-reduced-motion` respected; text resizes to 200% without loss.

## Interaction / Motion

No decorative motion. Allowed: instant state changes, an optional ≤150 ms fade for notices, and a visible "Sending…" step for simulated sync (deterministic, skippable in tests). Every action gives immediate visible feedback (status change, message, or error near the control). Repeated clicks are harmless (idempotent) and the UI shows the existing result instead of a duplicate.

## Existing References

- Flow baseline and screen inventory from the team's research workspace (`MVP USER FLOWS AND SCREENS.md`), carried into the screen map above.
- An earlier exploratory nine-step Mika walkthrough exists outside this repository; it may inform demo pacing but is not a design system or code base.
- No existing branding, design files, or assets have been supplied (OPEN).

## UI Constraints

- English only for now; no machine-translated or invented local terms.
- Fictional adults only; placeholder evidence tiles, no real artwork or photos.
- No dead-end controls: anything not implemented is rendered as disabled with "Not available in this prototype" text, or omitted.
- No council branding; no claim of official endorsement; council contact route is a labeled placeholder.
- Lightweight: no images beyond tiny inline SVG icons, no external assets.
