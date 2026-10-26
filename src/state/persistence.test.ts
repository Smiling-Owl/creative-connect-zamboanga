import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, STORAGE_KEY, initialState, loadState, saveState } from './persistence';

function memoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  } as Storage;
}

function throwingStorage(): Storage {
  return {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('quota');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
    clear: () => undefined,
    key: () => null,
    length: 0,
  } as Storage;
}

describe('demo state persistence', () => {
  it('starts from the baseline with no notice when nothing is saved', () => {
    const result = loadState(memoryStorage());
    expect(result.notice).toBeNull();
    expect(result.state.personaId).toBe('guest');
    expect(result.state.data.records.length).toBeGreaterThan(0);
  });

  it('restores a saved state round trip', () => {
    const storage = memoryStorage();
    const state = { ...initialState(), personaId: 'council', clock: 42 };
    saveState(state, storage);
    const loaded = loadState(storage);
    expect(loaded.state.personaId).toBe('council');
    expect(loaded.state.clock).toBe(42);
    expect(loaded.notice).toBeNull();
  });

  it('falls back to the baseline with a notice when stored JSON is unreadable', () => {
    const result = loadState(memoryStorage({ [STORAGE_KEY]: '{oops' }));
    expect(result.notice).toMatch(/could not be read/);
    expect(result.state.clock).toBe(0);
  });

  it('falls back when the stored data has another schema version or a missing shape', () => {
    const wrongVersion = JSON.stringify({ state: { ...initialState(), schemaVersion: SCHEMA_VERSION + 1 } });
    expect(loadState(memoryStorage({ [STORAGE_KEY]: wrongVersion })).notice).toMatch(/incompatible version/);
    const missingData = JSON.stringify({ state: { schemaVersion: SCHEMA_VERSION, personaId: 'guest', clock: 0, settings: { online: true, failNextSend: false } } });
    expect(loadState(memoryStorage({ [STORAGE_KEY]: missingData })).notice).toMatch(/incompatible version/);
  });

  it('keeps working when storage is blocked or full', () => {
    expect(() => saveState(initialState(), throwingStorage())).not.toThrow();
    const result = loadState(throwingStorage());
    expect(result.notice).toMatch(/could not be read/);
  });

  it('reports unavailable storage as a notice rather than an error', () => {
    const result = loadState(null);
    expect(result.notice).toMatch(/Browser storage is unavailable/);
  });
});
