import type { Actor } from './types';

// Frontend permission representation. It shapes what the prototype shows and what the
// domain functions accept. It is NOT real security; copy must say so.

export type Action =
  | 'view_public'
  | 'submit_intake'
  | 'edit_own_record'
  | 'manage_visibility'
  | 'express_interest'
  | 'respond_referral'
  | 'withdraw_referral'
  | 'request_case'
  | 'assist_record'
  | 'relay_response'
  | 'invite_account'
  | 'claim_record'
  | 'sync_queue'
  | 'council_review'
  | 'council_decide'
  | 'manage_opportunity'
  | 'manage_referral'
  | 'record_outcome'
  | 'view_council_records';

/** Target the action applies to. Coordinator actions require a site match; creative actions require a person match. */
export interface Target {
  siteId?: string | null;
  personId?: string | null;
}

const COUNCIL_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  'council_review',
  'council_decide',
  'manage_opportunity',
  'manage_referral',
  'record_outcome',
  'view_council_records',
  'view_public',
]);

const COORDINATOR_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  'assist_record',
  'submit_intake',
  'relay_response',
  'request_case',
  'invite_account',
  'sync_queue',
  'view_public',
]);

const CREATIVE_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  'submit_intake',
  'claim_record',
  'edit_own_record',
  'manage_visibility',
  'express_interest',
  'respond_referral',
  'withdraw_referral',
  'request_case',
  'view_public',
]);

/**
 * Returns true when the actor may perform the action on the target.
 * Guests may only view public information. Coordinators never approve, decline,
 * or grant roles. Council actions are unrestricted here; their reasons are enforced in the domain.
 */
export function can(actor: Actor, action: Action, target: Target = {}): boolean {
  switch (actor.role) {
    case 'guest':
      return action === 'view_public';
    case 'creative':
      if (!CREATIVE_ACTIONS.has(action)) return false;
      if (action === 'view_public') return true;
      return target.personId === actor.id;
    case 'coordinator':
      if (!COORDINATOR_ACTIONS.has(action)) return false;
      if (action === 'view_public') return true;
      return actor.siteId !== undefined && target.siteId === actor.siteId;
    case 'council':
      return COUNCIL_ACTIONS.has(action);
  }
}

