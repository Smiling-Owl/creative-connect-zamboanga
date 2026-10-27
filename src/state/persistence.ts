import { baselineData } from '../fixtures/baseline';
import { DEFAULT_PERSONA_ID } from '../fixtures/personas';
import type { DemoSettings, DomainData } from '../domain/types';

// Demo state is mirrored to this device's localStorage only. It is fictional and never leaves the browser.
// Every storage call is guarded: private windows and blocked storage must not break the prototype.

export const STORAGE_KEY = 'ccz-demo:v1';
export const SCHEMA_VERSION = 2;

export interface DemoAccessState {
  recovery: 'idle' | 'code_requested' | 'expired' | 'help';
  returnOpportunityId: string | null;
  signupContact: string;
  signupStatus: 'idle' | 'verification_pending' | 'verified';
}

export interface AppState {
  schemaVersion: number;
  personaId: string;
  settings: DemoSettings;
  /** Minutes since the demo origin. Advances by one for each successful action. */
  clock: number;
  data: DomainData;
  access: DemoAccessState;
}

export function initialState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    personaId: DEFAULT_PERSONA_ID,
    settings: { online: true, failNextSend: false },
    clock: 0,
    data: baselineData(),
    access: { recovery: 'idle', returnOpportunityId: null, signupContact: 'rhea@example.invalid', signupStatus: 'idle' },
  };
}

const DATA_ARRAYS = ['sites', 'staff', 'records', 'drafts', 'queue', 'opportunities', 'referrals', 'cases', 'audit'] as const;

function isDomainData(value: unknown): value is DomainData {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.seq === 'number' && DATA_ARRAYS.every((key) => Array.isArray(candidate[key]));
}

function isAppState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const settings = candidate.settings as Record<string, unknown> | undefined;
  return (
    typeof candidate.schemaVersion === 'number' &&
    typeof candidate.personaId === 'string' &&
    typeof candidate.clock === 'number' &&
    typeof settings === 'object' &&
    settings !== null &&
    typeof settings.online === 'boolean' &&
    typeof settings.failNextSend === 'boolean' &&
    isDomainData(candidate.data) &&
    typeof candidate.access === 'object' && candidate.access !== null &&
    ['idle', 'code_requested', 'expired', 'help'].includes(String((candidate.access as Record<string, unknown>).recovery)) &&
    ((candidate.access as Record<string, unknown>).returnOpportunityId === null || typeof (candidate.access as Record<string, unknown>).returnOpportunityId === 'string') &&
    typeof (candidate.access as Record<string, unknown>).signupContact === 'string' &&
    ['idle', 'verification_pending', 'verified'].includes(String((candidate.access as Record<string, unknown>).signupStatus))
  );
}

export function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface LoadResult {
  state: AppState;
  notice: string | null;
}

/** Loads saved demo state. Anything unreadable or from another schema version falls back to the baseline with a notice. */
export function loadState(storage: Storage | null = getStorage()): LoadResult {
  if (!storage) {
    return {
      state: initialState(),
      notice: 'Browser storage is unavailable. Demo changes will be lost when you reload this page.',
    };
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { state: initialState(), notice: null };
    const parsed = JSON.parse(raw) as { state?: unknown } | null;
    if (isAppState(parsed?.state) && parsed.state.schemaVersion === SCHEMA_VERSION) {
      return { state: parsed.state, notice: null };
    }
    return {
      state: initialState(),
      notice: 'Saved demo data was from an incompatible version, so the starting data was restored.',
    };
  } catch {
    return {
      state: initialState(),
      notice: 'Saved demo data could not be read, so the starting data was restored.',
    };
  }
}

export function saveState(state: AppState, storage: Storage | null = getStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), state }));
  } catch {
    // Quota or blocked storage: the in-memory demo keeps working.
  }
}

export function clearState(storage: Storage | null = getStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
