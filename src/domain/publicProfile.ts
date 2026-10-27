import { isListed } from './visibility';
import type { CreativeRecord, DomainData, IntakeFields } from './types';

// The only path from creative records to public views. Allow-listed fields only.
// Never add contact details, legal names, non-approved evidence, notes, history, site, or references here.

export interface PublicEvidence {
  kind: 'link' | 'sample' | 'assisted_description';
  text: string;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  practice: string;
  skills: string[];
  area: string;
  evidence: PublicEvidence[];
  lastUpdated: string;
}

/** Allow-listed projection for a proposed profile preview or approved record. */
export function projectPublicIntake(id: string, fields: IntakeFields, lastUpdated: string): PublicProfile {
  return {
    id,
    displayName: fields.displayName,
    practice: fields.practice,
    skills: [...fields.skills],
    area: fields.area,
    evidence: fields.evidence
      .filter((e) => e.publicApproved && e.text.trim() !== '')
      .map((e) => ({ kind: e.kind, text: e.text })),
    lastUpdated,
  };
}

function project(record: CreativeRecord): PublicProfile {
  return projectPublicIntake(record.id, record.intake, record.lastConfirmed);
}

/** Public profile for a listed record, or null. Private and unknown ids look identical to callers. */
export function publicProfileById(data: DomainData, id: string): PublicProfile | null {
  const record = data.records.find((r) => r.id === id);
  if (!record || !isListed(record)) return null;
  return project(record);
}

export function publicDirectory(data: DomainData): PublicProfile[] {
  return data.records.filter(isListed).map(project).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export interface DirectoryFilter {
  query?: string;
  practice?: string;
  skill?: string;
  area?: string;
}

/** Search and filter over the public directory only. Matching is on public fields. */
export function searchDirectory(data: DomainData, filter: DirectoryFilter): PublicProfile[] {
  const query = (filter.query ?? '').trim().toLowerCase();
  const practice = (filter.practice ?? '').trim().toLowerCase();
  const skill = (filter.skill ?? '').trim().toLowerCase();
  const area = (filter.area ?? '').trim().toLowerCase();
  return publicDirectory(data).filter((profile) => {
    if (practice && profile.practice.toLowerCase() !== practice) return false;
    if (skill && !profile.skills.some((item) => item.toLowerCase() === skill)) return false;
    if (area && profile.area.toLowerCase() !== area) return false;
    if (!query) return true;
    const haystack = [profile.displayName, profile.practice, profile.area, ...profile.skills].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}
