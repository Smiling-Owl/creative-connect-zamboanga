// Example guidance cards for the prototype. These are placeholders written for review, not council-approved content.
// Each card shows its source as a label, not a link, until the council confirms authoritative sources.

export interface GuidanceCard {
  id: string;
  topic: 'formalization' | 'ip' | 'support';
  title: string;
  summary: string;
  sourceLabel: string;
  lastReviewed: string;
}

export const GUIDANCE_DISCLAIMER =
  'Example guidance for prototype review. It is not legal advice, does not issue or approve permits, and is not a certification. Sources must be confirmed by the council before use.';

export const GUIDANCE: GuidanceCard[] = [
  {
    id: 'guide-formalization',
    topic: 'formalization',
    title: 'Registering with the council (example)',
    summary:
      'Registering with the council records your practice so the council can reach you. Business permits are decided by the issuing office, not by this service.',
    sourceLabel: 'Example source — to be confirmed by the council',
    lastReviewed: '2026-10-01',
  },
  {
    id: 'guide-ip',
    topic: 'ip',
    title: 'Keeping records of your work (example)',
    summary:
      'Dated drafts and original files help show when you made a work. Questions about copyright or ownership need an authorized adviser.',
    sourceLabel: 'Example source — to be confirmed by the council',
    lastReviewed: '2026-10-01',
  },
  {
    id: 'guide-support',
    topic: 'support',
    title: 'Getting help to register (example)',
    summary:
      'A barangay or school coordinator can sit with you. You can register without a portfolio website, and you can ask not to appear in the public directory.',
    sourceLabel: 'Example source — to be confirmed by the council',
    lastReviewed: '2026-10-01',
  },
];
