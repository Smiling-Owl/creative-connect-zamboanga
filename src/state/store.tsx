import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { personaById, type Persona } from '../fixtures/personas';
import type { Actor, Ctx, DomainData, Result } from '../domain/types';
import { clearState, getStorage, initialState, loadState, saveState, type AppState, type DemoAccessState } from './persistence';

// Single demo store. Views read state and call `run` with a domain function.
// `run` reads the latest state synchronously, so the caller gets the result in the same event handler.

export const DEMO_ORIGIN = '2026-10-26T09:00:00.000Z';

export function demoTime(minutes: number): string {
  return new Date(Date.parse(DEMO_ORIGIN) + minutes * 60_000).toISOString();
}

export type DomainFn = (data: DomainData, ctx: Ctx) => Result;

export interface DemoStore {
  state: AppState;
  setAccess: (access: Partial<DemoAccessState>) => void;
  persona: Persona;
  actor: Actor;
  notice: string | null;
  run: (fn: DomainFn) => Result;
  setPersona: (personaId: string) => void;
  setOnline: (online: boolean) => void;
  setFailNextSend: (failNextSend: boolean) => void;
  reset: () => void;
  dismissNotice: () => void;
}

const StoreContext = createContext<DemoStore | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => loadState());
  const [state, setState] = useState<AppState>(initial.state);
  const [notice, setNotice] = useState<string | null>(initial.notice);
  const latest = useRef<AppState>(state);

  const commit = useCallback((next: AppState) => {
    latest.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const run = useCallback<DemoStore['run']>(
    (fn) => {
      const current = latest.current;
      const ctx: Ctx = {
        actor: personaById(current.personaId).actor,
        at: demoTime(current.clock),
        settings: current.settings,
      };
      const result = fn(current.data, ctx);
      if (!result.ok) return result;
      // The "next send fails" setting is used up only by a send that actually failed.
      const settings =
        result.failedItemId !== undefined ? { ...current.settings, failNextSend: false } : current.settings;
      commit({ ...current, data: result.data, clock: current.clock + 1, settings });
      return result;
    },
    [commit],
  );

  const setPersona = useCallback(
    (personaId: string) => commit({ ...latest.current, personaId }),
    [commit],
  );

  const setOnline = useCallback(
    (online: boolean) => commit({ ...latest.current, settings: { ...latest.current.settings, online } }),
    [commit],
  );

  const setFailNextSend = useCallback(
    (failNextSend: boolean) => commit({ ...latest.current, settings: { ...latest.current.settings, failNextSend } }),
    [commit],
  );

  const setAccess = useCallback(
    (access: Partial<DemoAccessState>) => commit({ ...latest.current, access: { ...latest.current.access, ...access } }),
    [commit],
  );

  const reset = useCallback(() => {
    clearState(getStorage());
    setNotice(null);
    commit(initialState());
  }, [commit]);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const value = useMemo<DemoStore>(() => {
    const persona = personaById(state.personaId);
    return {
      state,
      setAccess,
      persona,
      actor: persona.actor,
      notice,
      run,
      setPersona,
      setOnline,
      setFailNextSend,
      reset,
      dismissNotice,
    };
  }, [state, notice, run, setPersona, setOnline, setFailNextSend, setAccess, reset, dismissNotice]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDemo(): DemoStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useDemo must be used inside DemoStoreProvider');
  return store;
}
