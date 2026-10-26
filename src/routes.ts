import type { Role } from './domain/types';

// Screen map from context/ui-context.md. View ids are kept for traceability.
// `roles: 'all'` means every persona may open the view. Otherwise a role outside the list sees an access panel.

export interface ViewDef {
  id: string;
  title: string;
  path: string;
  roles: Role[] | 'all';
}

export const VIEWS: ViewDef[] = [
  { id: 'P01', title: 'Welcome and program explanation', path: '/', roles: 'all' },
  { id: 'P02', title: 'Creative directory', path: '/directory', roles: 'all' },
  { id: 'P03', title: 'Public creative profile', path: '/directory/:profileId', roles: 'all' },
  { id: 'P04', title: 'Opportunities', path: '/opportunities', roles: 'all' },
  { id: 'P05', title: 'Opportunity details', path: '/opportunities/:opportunityId', roles: 'all' },
  { id: 'P06', title: 'Support and guidance', path: '/guidance', roles: 'all' },
  { id: 'A01', title: 'Account access and invitation', path: '/access', roles: 'all' },
  { id: 'A02', title: 'Access recovery', path: '/access/recover', roles: 'all' },
  { id: 'R01', title: 'Creative intake', path: '/apply', roles: ['creative', 'coordinator'] },
  { id: 'R02', title: 'Review, privacy choices, and submit', path: '/apply/review', roles: ['creative', 'coordinator'] },
  { id: 'C01', title: 'My home and application status', path: '/me', roles: ['creative'] },
  { id: 'C02', title: 'My profile and preferences', path: '/me/profile', roles: ['creative'] },
  { id: 'C03', title: 'My opportunities and referrals', path: '/me/referrals', roles: ['creative'] },
  { id: 'C03', title: 'Referral detail', path: '/me/referrals/:referralId', roles: ['creative'] },
  { id: 'F01', title: 'Coordinator workspace', path: '/coordinator', roles: ['coordinator'] },
  { id: 'F02', title: 'Assisted record and follow-up', path: '/coordinator/records/:recordId', roles: ['coordinator'] },
  { id: 'M01', title: 'Council overview and review queue', path: '/council', roles: ['council'] },
  { id: 'M02', title: 'Application review', path: '/council/applications/:recordId', roles: ['council'] },
  { id: 'M03', title: 'Opportunity management', path: '/council/opportunities', roles: ['council'] },
  { id: 'M04', title: 'Opportunity editor and preview', path: '/council/opportunities/:opportunityId/edit', roles: ['council'] },
  { id: 'M05', title: 'Referral tracker and outcome detail', path: '/council/referrals', roles: ['council'] },
  { id: 'M05', title: 'Referral roster for one opportunity', path: '/council/referrals/:opportunityId', roles: ['council'] },
];

export interface NavItem {
  label: string;
  to: string;
}

/** Destinations per role from the navigation table in context/ui-context.md. */
export const NAV: Record<Role, NavItem[]> = {
  guest: [
    { label: 'Directory', to: '/directory' },
    { label: 'Opportunities', to: '/opportunities' },
    { label: 'Guidance', to: '/guidance' },
    { label: 'Join or sign in', to: '/access' },
  ],
  creative: [
    { label: 'Home', to: '/me' },
    { label: 'Opportunities', to: '/opportunities' },
    { label: 'My referrals', to: '/me/referrals' },
    { label: 'Profile', to: '/me/profile' },
  ],
  coordinator: [
    { label: 'Workspace', to: '/coordinator' },
    { label: 'Add creative', to: '/apply' },
  ],
  council: [
    { label: 'Overview and queue', to: '/council' },
    { label: 'Opportunities', to: '/council/opportunities' },
    { label: 'Referrals', to: '/council/referrals' },
  ],
};

export function canOpen(view: ViewDef, role: Role): boolean {
  return view.roles === 'all' || view.roles.includes(role);
}
