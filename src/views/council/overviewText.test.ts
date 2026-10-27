import { describe, expect, it } from 'vitest';
import { figure, totalFigure } from './overviewText';

const SINCE = 'since demo start';
const EMPTY = 'no records yet';

describe('overview figures', () => {
  it('state the count, the denominator, and the window in plain text', () => {
    expect(figure({ count: 7, base: 12, noun: 'received applications', window: SINCE, empty: EMPTY })).toBe('7 of 12 received applications (since demo start)');
  });

  it('show a dash and the empty-state note when the denominator is zero', () => {
    expect(figure({ count: 0, base: 0, noun: 'received records', window: SINCE, empty: EMPTY })).toBe('— (no records yet, since demo start)');
  });

  it('never render NaN, Infinity, or a percentage for empty or invalid bases', () => {
    const cases: Array<[number, number]> = [[0, 0], [Number.NaN, 0], [3, Number.NaN], [1, -2], [Number.POSITIVE_INFINITY, 0]];
    for (const [count, base] of cases) {
      const text = figure({ count, base, noun: 'records', window: SINCE, empty: EMPTY });
      expect(text).not.toMatch(/NaN|Infinity|%/);
      expect(text).toContain('—');
    }
  });

  it('a total with no denominator still states its window', () => {
    expect(totalFigure({ count: 9, noun: 'received records', window: SINCE })).toBe('9 received records (since demo start)');
  });
});
