import type { AuditEvent, Ctx, DomainData, Result } from './types';

// Shared helpers for transitions. Transitions never mutate their input: they clone,
// change the clone, and return it. DomainData is JSON-safe by design.

export function cloneData(data: DomainData): DomainData {
  return JSON.parse(JSON.stringify(data)) as DomainData;
}

/** Deterministic id such as `rec-0007`. Advances the shared counter on the given (cloned) data. */
export function nextId(data: DomainData, prefix: string): string {
  data.seq += 1;
  return `${prefix}-${String(data.seq).padStart(4, '0')}`;
}

/** Council reference such as `CCZ-0007`. */
export function nextReference(data: DomainData): string {
  data.seq += 1;
  return `CCZ-${String(data.seq).padStart(4, '0')}`;
}

export function nextDeviceRef(data: DomainData, siteCode: string): string {
  data.seq += 1;
  return `DEV-${siteCode}-${String(data.seq).padStart(3, '0')}`;
}

export interface LogInput {
  entityType: AuditEvent['entityType'];
  entityId: string;
  action: string;
  from?: string | null;
  to?: string | null;
  reason?: string | null;
  viaId?: string | null;
}

/** Appends an audit event for the acting user. Mutates the cloned data passed in. */
export function log(data: DomainData, ctx: Ctx, input: LogInput): void {
  const event: AuditEvent = {
    id: nextId(data, 'evt'),
    at: ctx.at,
    actor: { role: ctx.actor.role, id: ctx.actor.id },
    via: input.viaId ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    from: input.from ?? null,
    to: input.to ?? null,
    reason: input.reason ?? null,
  };
  data.audit.push(event);
}

export function fail(code: string, message: string): Result {
  return { ok: false, code, message };
}

/** Returns the trimmed reason, or null when it is missing or blank. */
export function requireReason(reason: string | undefined | null): string | null {
  const trimmed = (reason ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function reasonMissing(what: string): Result {
  return fail('reason_required', `Add a short reason before you ${what}.`);
}

export function findRecord(data: DomainData, id: string) {
  return data.records.find((r) => r.id === id) ?? null;
}

export function findReferral(data: DomainData, id: string) {
  return data.referrals.find((r) => r.id === id) ?? null;
}

export function findOpportunity(data: DomainData, id: string) {
  return data.opportunities.find((o) => o.id === id) ?? null;
}

export function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** The published deadline date remains open through its final simulated minute. */
export function deadlinePassed(deadline: string, at: string): boolean {
  return at.slice(0, 10) > deadline;
}
