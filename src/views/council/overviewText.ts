// Pure text helpers for the council overview. Every figure states its denominator and window.
// Empty or invalid bases render as a dash with an empty-state note, never as NaN, Infinity, or a percentage.

function wholeOrZero(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** "7 of 12 received applications (since demo start)", or "— (no records yet, since demo start)" when the base is zero. */
export function figure(input: { count: number; base: number; noun: string; window: string; empty: string }): string {
  const base = wholeOrZero(input.base);
  const count = wholeOrZero(input.count);
  if (base === 0) return `— (${input.empty}, ${input.window})`;
  return `${count} of ${base} ${input.noun} (${input.window})`;
}

/** A total with no separate denominator, such as "9 received records (since demo start)". */
export function totalFigure(input: { count: number; noun: string; window: string }): string {
  return `${wholeOrZero(input.count)} ${input.noun} (${input.window})`;
}

/** Window phrase for current-state figures. */
export function currentWindow(asOf: string): string {
  return `current state, as of ${asOf}`;
}
