# UI Context

UI is central to this project: the deliverable is a clickable prototype judged by how understandable its journeys are. Status markers: APPROVED / PROPOSED / OPEN as in `architecture-context.md`. Visual details below are PROPOSED unless stated.

## Product Feel

A calm, trustworthy public service that helps people, not a marketing site or a marketplace. Plain language, honest about limits, never promising work or certification. Every screen answers "where am I, what is the status, what happens next?". The prototype is visibly a prototype: a persistent but unobtrusive "Prototype · fictional data" marker in the product chrome.

## Visual Direction

**Vinta theme — user-directed revision, 2026-10-28.** The team supplied a Zamboanga vinta-sail palette and asked for a modern, simple, low-bandwidth look drawn from the design philosophy of sites such as Apple, GOV.UK, Linear, and Stripe. This replaces the earlier "no official colors / no cultural motifs" rule for colour and motif only.

- Identity is now the **JUNTO** logo supplied by the project owner (`public/junto-logo*.png`, with a tagline in the logo artwork), shown with a **JUNTO** text wordmark beside it in the header. The subtitle "Proposed service concept for the Zamboanga City Creative Council — not an official council site" is unchanged. The favicon is `public/favicon.webp`. The earlier council logo, seal, name lockup, and pattern artwork were never reproduced.
- Philosophy (principles only; no layout, assets, or trade dress copied):
  - **Deference and restraint (Apple):** content first, generous whitespace, one idea per section, colour mostly in small signature details, not chrome.
  - **Plain, robust service design (GOV.UK):** mobile-first single column, readable line length, no restyling of status meaning, works on slow connections and older devices.
  - **Show real work (Linear):** realistic records, references, and statuses instead of decoration.
  - **Proof points (Stripe):** large numerals with small labels for council figures.
- Roughly 90% neutral (dark ink on off-white and white); bright vinta colours appear as the signature band, the sail mark, role-area markers, badges, and primary actions only. Never use the raw palette yellow, orange, or blue for body text.
- No hero imagery, photos, illustrations, background patterns, or decorative gradients beyond the vinta band, the sail mark, and one decorative sail composition on the P01 welcome hero (shown at ≥ 1024 px only). Work evidence stays as text cards and placeholder tiles labeled "Sample (fictional)".
- No invented local terminology; English only.

### Vinta signature

- **Band:** a 10 px header band (8 px below 640 px) and a 6 px footer band of large diagonal two-colour triangle segments (about 96 px wide) in orange, green, yellow, and blue, after a vinta sail. Built in CSS as a pseudo-element; an inline SVG data URI (under 1.5 KB raw, no network request) or hard-stop gradients are allowed; no image files. It never touches or sits behind text.
- **Sail mark:** a small original four-triangle mark beside the wordmark (inline SVG or CSS, under 1 KB, decorative).
- **Hero sail (P01 only):** one original composition of overlapping palette triangles beside the welcome headline, inline SVG under 1 KB, `aria-hidden` and `focusable="false"`, coloured through the palette tokens, hidden below 1024 px. It is the only illustration in the product.
- **Role-area markers:** each area gets one palette colour, shown as a small sail triangle before the page heading and as the active-navigation underline. The marker is never the only way to know where you are; the heading and navigation text carry the meaning.
  - Public/guest: blue
  - Creative: orange
  - Coordinator: green
  - Council: yellow

### Modern revision (v2) — 2026-10-28

User feedback on the first vinta theme: "right theme, some philosophies right, but it looks old". v2 keeps the palette, tokens, accessibility rules, copy, and low-bandwidth limits, and changes the visual language from a document/form look to a contemporary product look.

What read as "old": narrow centred column floating in grey on desktop, outlined boxes everywhere, underlined links on every card, small wordmark, tiny tables in boxes, and every section having the same visual weight.

v2 rules:

1. **Width and rhythm.** A page container up to 72 rem with 24 px gutters (16 px on phones). Reading text and forms stay in a ~44 rem column; P01, directory, opportunities, coordinator, and council lists use the full container. Section gaps 48 px (phones) to 80 px (desktop).
2. **Display typography.** Page titles weight 800, `clamp(2rem, 1.4rem + 2.6vw, 3.25rem)`, tracking about −0.03em, line height 1.05. Hero display up to about 4.5 rem. Section headings 700, tracking −0.02em. Eyebrows: 0.8125–0.875 rem, 600, uppercase, letter-spaced, muted (never below 14 px for body copy; the eyebrow screen ID is a label, not body copy, and stays ≥ 13 px and ≥ 4.5:1).
3. **Header.** One compact white bar (about 100 px including its context row at ≥ 1150 px), sticky only at ≥ 1150 px with `scroll-padding-top` equal to its height plus 16 px (WCAG 2.2 focus not obscured); static below that, hairline bottom border. Wordmark larger (about 1.125 rem, 800). Navigation as a segmented pill group at ≥ 900 px: a light grey track holding the links (below 900 px the navigation sits behind a **Menu** disclosure button in the brand row — `aria-expanded`/`aria-controls`, Escape closes and returns focus, closes after navigation — and opens as a full-width stack of 44 px rows; no hidden horizontal scrolling); the active link is a white raised pill with ink text, bold weight, and a small area-colour dot (shape plus weight plus `aria-current`, never colour alone). The subtitle, prototype pill, and "Viewing as" sit on one quiet context row beneath, ≥ 14 px, muted. Header band 4 px, crisp.
4. **Surfaces.** Cards are borderless white with a 20 px radius and a near-invisible ring (`0 0 0 1px rgb(43 46 50 / 8%)` plus at most a 1–2 px, low-alpha offset shadow; no large blur). Interactive cards are whole-card links with an arrow ("→") affordance, no underline, and a 150 ms 1–2 px lift on hover (reduced-motion: none). Inline links inside body text keep a thin underline.
5. **Bento grids.** Groups of entry points or summary figures use a bento grid: mixed spans where content fills them (no mostly-empty tiles; P01's three entry points sit in one row of equal tiles) at desktop, one column on phones. Tiles may use palette tints as backgrounds: orange `#FFF0EB`, green `#EBF5EF`, yellow `#FFF4D6`, blue `#EBF5FC` (ink 12.2–12.5:1, muted ≥ 6.1:1 on each).
6. **Hero (P01).** A dark rounded hero panel (`#2B2E32`, 24–28 px radius) spanning the container: white display headline, lead text `#C9CDD2` (8.54:1), primary action in vinta yellow with ink text (7.95:1), secondary as a white-outline pill. A bold layered sail composition on the right at ≥ 1024 px (smaller row of sails above the headline on phones is optional). The vinta band runs along the hero's bottom edge. The page h1 stays, small, above the hero.
7. **Page header (other pages).** Eyebrow row: small area-colour sail + screen ID chip. Then the large page title. No heavy marker beside the h1.
8. **Forms.** 48 px inputs, 12 px radius, white fill with a ≥ 3:1 border, generous labels (600). Intake steps as a segmented progress control (pills in a track; completed/current states shown by fill, weight, and text, not colour alone).
9. **Badges.** Soft pills with a leading 8 px dot in the tone ink; text unchanged.
10. **Data.** Council figures as bento stat tiles: large 800-weight numerals (about 2.25–2.5 rem, tabular), small muted denominators. Tables are modern data tables: no boxed borders, hairline row dividers, generous row height, small uppercase captions. Table semantics stay intact.
11. **Buttons.** Pills, 48 px tall on primary actions (44 px minimum elsewhere), 600 weight. Primary green `#008434` with white text on light surfaces; yellow with ink text on the dark hero; secondary ink outline; quiet buttons text-only with an arrow where they navigate.
12. **Demo controls** stay clearly outside the product: a slim dashed purple pill above the header.
13. **Budget.** Still no images, web fonts, filters, backdrop blur, or external requests. Total CSS ≤ about 7 KB gzipped.

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

- System font stack (no web-font download): `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif`.
- Body 1.0625 rem (17 px) at line height 1.55; secondary text 0.9375 rem; never below 14 px, except short uppercase eyebrow labels and screen-ID chips (≥ 13 px, ≥ 4.5:1).
- Headings 700 weight with slight negative tracking (about −0.01em) at large sizes. Page title `clamp(1.75rem, 1.2rem + 2.4vw, 2.5rem)`; section 1.5 rem; sub-section 1.1875 rem. Body 400.
- Short headings and one supporting sentence; sentence case labels; tabular figures in tables and counts. Council figures may use large numerals (about 2 rem) with small labels.

## Spacing

4 px base; scale 4 · 8 · 12 · 16 · 24 · 32 · 48 · 72. Page gutter 16 px on mobile, 24 px on tablet+. Section gaps 32 px on mobile, 48 px on desktop. Form fields separated by 16–24 px; related controls grouped with 8 px.

## Design Tokens

Defined once as CSS custom properties in `src/styles/tokens.css`. Contrast stays ≥ 4.5:1 for text and ≥ 3:1 for UI boundaries and focus indicators (ratios below were computed with the WCAG 2.x formula).

| Token | Purpose | Value |
|---|---|---|
| `--vinta-orange` / `-green` / `-yellow` / `-blue` | Signature band, sail mark, role markers, fills (decorative or large/UI only) | `#FE4800` / `#008735` / `#FEBA00` / `#007ED5` |
| `--color-bg` | Page background | `#F8F8F8` |
| `--color-surface` | Cards, panels | `#FFFFFF` |
| `--color-ink` | Body text, headings | `#2B2E32` (12.84:1 on bg) |
| `--color-ink-muted` | Secondary text | about `#565B62` (≥ 6:1) |
| `--color-border` | Inputs, UI boundaries | ≥ 3:1 against surface |
| `--color-divider` | Card edges and rules (decorative) | light neutral |
| `--color-accent` | Primary buttons (white text) | `#008434` text-safe green (4.83:1 with white) |
| `--color-link` | Links | `#0067B1` text-safe blue (5.53:1 on bg) |
| `--color-focus` | Focus ring | `#2B2E32` 3 px outline, 3 px offset, with a palette-yellow halo |
| Status tones | Badge ink on tinted background | info `#0067B1` on `#E6F2FB` (5.16), success `#006B2A` on `#E6F3EB` (5.86), warning `#5C4400` on `#FFF4D6` (8.40), danger `#B83400` on `#FFEDE5` (5.24), neutral dark on grey |
| `--color-demo` | Demo controls | distinct from the vinta palette (dashed outline) |
| `--radius` / `--radius-lg` | Controls / cards (buttons are pills, `999px`) | `8px` / `16px` |
| `--space-1…8` | Spacing scale | 4…72 px |
| `--tap-min` | Minimum target | `44px` |

Palette contrast reference: orange `#FE4800` 3.22:1 and blue `#007ED5` 4.00:1 on `#F8F8F8` (large text/UI only); green `#008735` 4.38:1 (use the text-safe `#008434`); yellow `#FEBA00` 1.62:1 (never text on light; dark text on yellow is 7.95:1).

Surfaces are flat: 1 px dividers, no blur shadows or filters. No dark mode in this release; colors must not depend on OS theme (`color-scheme: light`).

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

Council aggregate variants (2026-10-28): M01 reporting reuses the labels above. Only where the canonical label addresses the creative in the second person does the council overview use a neutral variant from `COUNCIL_AGGREGATE_LABEL` in `src/labels.ts`: application declined → "Declined — see reason", referral offered → "Place offered — awaiting creative response", referral declined → "Offer declined by creative". Funnel stage names (for example "Place confirmed") name cumulative stages, not current states.

Copy rules: never "approved for work", "hired", "paid", "income", "certified", "guaranteed", or "official"; say "simulated" wherever an action would involve real credentials, devices, or messages; notifications read "In-app example — no SMS or email is sent".

## Components / Reuse Principles

Build a small shared set before views: app shell and nav, demo controls, page header with status, status badge, status timeline, next-action card, form field (label, hint, error, required marker), choice group, stepper, record list/queue row, list/detail layout, profile card (public projection), opportunity detail, referral detail with actions, review action panel with required reason, confirmation dialog, inline notice (info/warning/error/simulation), empty state, access-not-available panel. Prefer composition over configuration flags; do not build a generic component library.

## Responsive Behavior

- Must work without horizontal scroll or clipped controls at 320 px, 360 px, 768 px (tablet), and ≥1280 px (desktop).
- Tables become stacked rows/cards below 640 px; long references and names wrap.
- The header and demo bar are not sticky. If anything becomes sticky, it must not consume more than ~20% of a 320×568 viewport. The demo bar collapses to a single pill button. The non-sticky mobile header stays compact without dropping the required subtitle: measured at 320×568 on 2026-10-28 as 239 px (guest), 214 px (creative, coordinator), and 258 px (council).
- Intake and coordinator views are designed at 360 px first; council review is designed at 1280 px first and degrades to stacked steps.

## Accessibility

Target WCAG 2.2 AA. Semantic landmarks and headings; every input has a visible label and programmatic association; hints and errors tied with `aria-describedby`; error summary at top of forms linking to fields; status changes announced via a polite live region; dialogs trap and restore focus; visible focus ring on every interactive element; ~44 px targets; color never the only status signal; `prefers-reduced-motion` respected; text resizes to 200% without loss.

## Interaction / Motion

No decorative motion. Transitions of colour or opacity up to 150 ms run only under `prefers-reduced-motion: no-preference`. Allowed: instant state changes, an optional ≤150 ms fade for notices, and a visible "Sending…" step for simulated sync (deterministic, skippable in tests). Every action gives immediate visible feedback (status change, message, or error near the control). Repeated clicks are harmless (idempotent) and the UI shows the existing result instead of a duplicate.

## Existing References

- Flow baseline and screen inventory from the team's research workspace (`MVP USER FLOWS AND SCREENS.md`), carried into the screen map above.
- An earlier exploratory nine-step Mika walkthrough exists outside this repository; it may inform demo pacing but is not a design system or code base.
- No existing branding, design files, or assets have been supplied (OPEN).

## UI Constraints

- English only for now; no machine-translated or invented local terms.
- Fictional adults only; placeholder evidence tiles, no real artwork or photos.
- No dead-end controls: anything not implemented is rendered as disabled with "Not available in this prototype" text, or omitted.
- No council logo, seal, name lockup, or supplied pattern artwork; the vinta palette is used by team direction (2026-10-28). No claim of official endorsement; council contact route is a labeled placeholder.
- Lightweight: no images beyond tiny inline SVG icons, no external assets, no web fonts. Decoration is limited to the CSS vinta band and the small inline-SVG sail mark and P01 hero sail. The theme should add no more than about 3 KB gzipped CSS.
