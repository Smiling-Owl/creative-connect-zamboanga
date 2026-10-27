import { NotificationList } from '../../components/NotificationList';
import { councilOverview, noticesFor } from '../../domain/selectors';
import type { OpportunityState, ReferralState } from '../../domain/types';
import {
  FUNNEL_NOTE,
  FUNNEL_STAGE_LABEL,
  LISTING_LABEL,
  NOT_EVIDENCE_NOTE,
  NOT_RECEIVED_NOTE,
  NO_OPPORTUNITIES_YET,
  NO_RECORDS_YET,
  NO_REFERRALS_YET,
  OPPORTUNITY_LABEL,
  OVERVIEW_SECTION_LABEL,
  PENDING_LABEL,
  councilApplicationLabel,
  councilReferralLabel,
  SELF_SERVICE_SITE_LABEL,
  SINCE_DEMO_START,
  SOURCE_LABEL,
  SYNTHETIC_DATA_LABEL,
} from '../../labels';
import { demoTime, useDemo } from '../../state/store';
import { currentWindow, figure, totalFigure } from './overviewText';

// M01 overview panel. Every number comes from domain/selectors.ts; this view only formats it.
// Each figure states its denominator and window in text.

const RECORD_ORDER = ['verified', 'changes_requested', 'declined', 'under_review', 'received'] as const;
const OPPORTUNITY_ORDER: OpportunityState[] = ['draft', 'published', 'closed', 'cancelled'];
const REFERRAL_ORDER: ReferralState[] = [
  'interest', 'under_review', 'offered', 'not_selected', 'accepted', 'declined',
  'confirmed', 'completed', 'did_not_attend', 'awaiting_follow_up', 'cancelled',
];
const EXCEPTION_ORDER = ['not_selected', 'declined', 'cancelled', 'did_not_attend', 'awaiting_follow_up'] as const;

interface Row {
  label: string;
  text: string;
}

// A leading whole number is shown as a large numeral with the rest as a small label. The text content is unchanged.
function FigureText({ text }: { text: string }) {
  const match = /^(\d+)([\s\S]*)$/.exec(text);
  if (!match) return <>{text}</>;
  return (
    <>
      <span className="figure-value">{match[1]}</span>{" "}
      <span className="figure-label">{(match[2] ?? '').trimStart()}</span>
    </>
  );
}

function FigureTable({ caption, rows }: { caption: string; rows: Row[] }) {
  return (
    <table className="overview-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Measure</th>
          <th scope="col">Figure, denominator and window</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td><FigureText text={row.text} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CouncilOverviewPanel() {
  const { state, actor } = useDemo();
  const overview = councilOverview(state.data, demoTime(state.clock));
  const notices = noticesFor(state.data, actor, 10);
  const current = currentWindow(overview.asOf);
  const combined = `${SINCE_DEMO_START}; ${current}`;
  const cumulativeWindow = `cumulative from recorded history, ${SINCE_DEMO_START}`;
  const { counts, pending, referrals, receivedBase, referralBase, opportunityBase } = overview;
  const cumulative = referrals.cumulative;

  const pendingRows: Row[] = [
    { label: PENDING_LABEL.new, text: figure({ count: pending.new, base: receivedBase, noun: 'received records', window: combined, empty: NO_RECORDS_YET }) },
    { label: PENDING_LABEL.resubmitted, text: figure({ count: pending.resubmitted, base: receivedBase, noun: 'received records', window: combined, empty: NO_RECORDS_YET }) },
    { label: PENDING_LABEL.underReview, text: figure({ count: pending.underReview, base: receivedBase, noun: 'received records', window: combined, empty: NO_RECORDS_YET }) },
    { label: PENDING_LABEL.profileUpdates, text: figure({ count: pending.profileUpdates, base: receivedBase, noun: 'received records', window: combined, empty: NO_RECORDS_YET }) },
    { label: PENDING_LABEL.openCases, text: totalFigure({ count: pending.openCases, noun: 'open cases', window: current }) },
    { label: PENDING_LABEL.overdue, text: figure({ count: pending.overdue, base: receivedBase, noun: 'received records', window: combined, empty: NO_RECORDS_YET }) },
  ];

  const recordRows: Row[] = RECORD_ORDER.map((recordState) => ({
    label: councilApplicationLabel(recordState),
    text: figure({ count: overview.recordsByState[recordState], base: receivedBase, noun: 'received records', window: combined, empty: NO_RECORDS_YET }),
  }));

  const listingRows: Row[] = [
    { label: LISTING_LABEL.listed.label, text: figure({ count: counts.listed, base: counts.verified, noun: 'verified members', window: current, empty: NO_RECORDS_YET }) },
    { label: LISTING_LABEL.not_listed.label, text: figure({ count: counts.verifiedNotListed, base: counts.verified, noun: 'verified members', window: current, empty: NO_RECORDS_YET }) },
  ];

  const opportunityRows: Row[] = OPPORTUNITY_ORDER.map((opportunityState) => ({
    label: OPPORTUNITY_LABEL[opportunityState].label,
    text: figure({ count: counts.opportunities[opportunityState], base: opportunityBase, noun: 'opportunities', window: current, empty: NO_OPPORTUNITIES_YET }),
  }));

  const currentReferralRows: Row[] = REFERRAL_ORDER.map((referralState) => ({
    label: councilReferralLabel(referralState),
    text: figure({ count: referrals.current[referralState], base: referralBase, noun: 'referrals', window: current, empty: NO_REFERRALS_YET }),
  }));

  const funnelRows: Row[] = [
    { label: FUNNEL_STAGE_LABEL.initiated, text: totalFigure({ count: cumulative.initiated, noun: 'referrals started', window: SINCE_DEMO_START }) },
    { label: FUNNEL_STAGE_LABEL.offered, text: figure({ count: cumulative.offered, base: cumulative.initiated, noun: 'referrals started', window: cumulativeWindow, empty: NO_REFERRALS_YET }) },
    { label: FUNNEL_STAGE_LABEL.accepted, text: figure({ count: cumulative.accepted, base: cumulative.initiated, noun: 'referrals started', window: cumulativeWindow, empty: NO_REFERRALS_YET }) },
    { label: FUNNEL_STAGE_LABEL.confirmed, text: figure({ count: cumulative.confirmed, base: cumulative.initiated, noun: 'referrals started', window: cumulativeWindow, empty: NO_REFERRALS_YET }) },
    { label: FUNNEL_STAGE_LABEL.attended, text: figure({ count: cumulative.attended, base: cumulative.initiated, noun: 'referrals started', window: cumulativeWindow, empty: NO_REFERRALS_YET }) },
  ];

  const exceptionRows: Row[] = EXCEPTION_ORDER.map((exception) => ({
    label: councilReferralLabel(exception),
    text: figure({ count: referrals.exceptions[exception], base: referralBase, noun: 'referrals', window: current, empty: NO_REFERRALS_YET }),
  }));

  const siteRows: Row[] = overview.siteCoverage.map((row) => ({
    label: row.key === 'self_service' ? SELF_SERVICE_SITE_LABEL : state.data.sites.find((site) => site.id === row.key)?.name ?? row.key,
    text: figure({ count: row.count, base: row.base, noun: 'received records', window: SINCE_DEMO_START, empty: NO_RECORDS_YET }),
  }));

  const sourceRows: Row[] = overview.sourceCoverage.map((row) => ({
    label: SOURCE_LABEL[row.key],
    text: figure({ count: row.count, base: row.base, noun: 'received records', window: SINCE_DEMO_START, empty: NO_RECORDS_YET }),
  }));

  return (
    <>
      <section className="public-card overview-panel" aria-labelledby="overview-heading">
        <h2 id="overview-heading">Council overview</h2>
        <p className="synthetic-label"><strong>{SYNTHETIC_DATA_LABEL}</strong></p>
        <p>{NOT_RECEIVED_NOTE}</p>
        <p>{NOT_EVIDENCE_NOTE}</p>
        <div className="overview-grid">
          <section className="overview-block" aria-labelledby="overview-pending">
            <h3 id="overview-pending">{OVERVIEW_SECTION_LABEL.pending}</h3>
            <FigureTable caption={combined} rows={pendingRows} />
          </section>
          <section className="overview-block" aria-labelledby="overview-records">
            <h3 id="overview-records">{OVERVIEW_SECTION_LABEL.recordsByStatus}</h3>
            <FigureTable caption={combined} rows={recordRows} />
          </section>
          <section className="overview-block" aria-labelledby="overview-listing">
            <h3 id="overview-listing">{OVERVIEW_SECTION_LABEL.listing}</h3>
            <FigureTable caption={current} rows={listingRows} />
          </section>
          <section className="overview-block" aria-labelledby="overview-opportunities">
            <h3 id="overview-opportunities">{OVERVIEW_SECTION_LABEL.opportunities}</h3>
            <FigureTable caption={current} rows={opportunityRows} />
          </section>
          <section className="overview-block" aria-labelledby="overview-current-referrals">
            <h3 id="overview-current-referrals">{OVERVIEW_SECTION_LABEL.currentReferrals}</h3>
            <FigureTable caption={current} rows={currentReferralRows} />
          </section>
          <section className="overview-block" aria-labelledby="overview-funnel">
            <h3 id="overview-funnel">{OVERVIEW_SECTION_LABEL.cumulativeFunnel}</h3>
            <p>{FUNNEL_NOTE}</p>
            <FigureTable caption={cumulativeWindow} rows={funnelRows} />
          </section>
          <section className="overview-block" aria-labelledby="overview-exceptions">
            <h3 id="overview-exceptions">{OVERVIEW_SECTION_LABEL.exceptions}</h3>
            <FigureTable caption={current} rows={exceptionRows} />
          </section>
          <section className="overview-block" aria-labelledby="overview-sites">
            <h3 id="overview-sites">{OVERVIEW_SECTION_LABEL.siteCoverage}</h3>
            <FigureTable caption={SINCE_DEMO_START} rows={siteRows} />
          </section>
          <section className="overview-block" aria-labelledby="overview-sources">
            <h3 id="overview-sources">{OVERVIEW_SECTION_LABEL.sourceCoverage}</h3>
            <FigureTable caption={SINCE_DEMO_START} rows={sourceRows} />
          </section>
        </div>
      </section>
      <NotificationList notices={notices} title={OVERVIEW_SECTION_LABEL.activity} emptyText="No recent activity yet." />
    </>
  );
}
