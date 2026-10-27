import { describe, expect, it } from 'vitest';
import { publicDirectory, publicProfileById, searchDirectory } from './publicProfile';
import { fresh } from '../test/helpers';

// Strings that must never appear in any public output: contact labels, follow-up routes, notes,
// site and coordinator details, council references, and non-approved evidence.
const PRIVATE_MARKERS = [
  'Demo messaging contact',
  'coordinator_mediated',
  'channelLabel',
  'Private sample',
  'internal',
  'coord-',
  'site-',
  'CCZ-',
  'DEV-',
  'siteId',
  'personId',
  'followUp',
  'reason',
];

describe('public projection', () => {
  it('the directory returns only listed records', () => {
    const names = publicDirectory(fresh()).map((p) => p.id).sort();
    expect(names).toEqual(['rec-dani', 'rec-noel', 'rec-rhea', 'rec-vina']);
  });

  it('filters by an exact public skill', () => {
    expect(searchDirectory(fresh(), { skill: 'Poster layout' }).map((profile) => profile.id)).toEqual(['rec-rhea']);
  });

  it('a private verified record is not reachable by id', () => {
    expect(publicProfileById(fresh(), 'rec-joel')).toBeNull();
  });

  it('an unknown id looks the same as a private one', () => {
    expect(publicProfileById(fresh(), 'rec-does-not-exist')).toBeNull();
  });

  it('no public profile contains private fields, notes, references, or non-approved evidence', () => {
    const data = fresh();
    for (const profile of publicDirectory(data)) {
      const text = JSON.stringify(profile);
      for (const marker of PRIVATE_MARKERS) {
        expect(text, `profile ${profile.id} leaks "${marker}"`).not.toContain(marker);
      }
      expect(Object.keys(profile).sort()).toEqual(['area', 'displayName', 'evidence', 'id', 'lastUpdated', 'practice', 'skills']);
    }
  });

  it('public evidence includes only items the creator approved, even on a listed record with private items', () => {
    const data = fresh();
    const withPrivate = {
      ...data,
      records: data.records.map((r) =>
        r.id === 'rec-dani'
          ? { ...r, intake: { ...r.intake, evidence: [...r.intake.evidence, { id: 'ev-private', kind: 'sample' as const, text: 'Private contact sheet (fictional)', publicApproved: false }] } }
          : r,
      ),
    };
    const profile = publicProfileById(withPrivate, 'rec-dani')!;
    expect(profile).not.toBeNull();
    expect(profile.evidence.map((e) => e.text)).not.toContain('Private contact sheet (fictional)');
    expect(profile.evidence.length).toBe(withPrivate.records.find((r) => r.id === 'rec-dani')!.intake.evidence.filter((e) => e.publicApproved).length);
  });
});
