import { personaById } from '../fixtures/personas';
import { baselineData } from '../fixtures/baseline';
import type { Ctx, DemoSettings, DomainData } from '../domain/types';

export const ORIGIN = '2026-10-26T09:00:00.000Z';

/** Context for a persona id from the fixtures. Defaults to online with no injected failure. */
export function ctxFor(personaId: string, settings: Partial<DemoSettings> = {}, at: string = ORIGIN): Ctx {
  return {
    actor: personaById(personaId).actor,
    at,
    settings: { online: true, failNextSend: false, ...settings },
  };
}

export function fresh(): DomainData {
  return baselineData();
}
