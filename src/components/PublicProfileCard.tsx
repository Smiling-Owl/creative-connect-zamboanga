import type { ReactNode } from 'react';
import type { PublicProfile } from '../domain/publicProfile';

/** Renders only a public projection, including for an unpublished draft preview. */
export function PublicProfileCard({ profile, eyebrow = 'Public profile', draftPreview = false, children }: { profile: PublicProfile; eyebrow?: string; draftPreview?: boolean; children?: ReactNode }) {
  return <article className="public-card"><p className="eyebrow">{eyebrow}</p><h2>{profile.displayName}</h2><p>{profile.practice} · {profile.area}</p><h3>Skills</h3><ul>{profile.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul><h3>Work examples</h3>{profile.evidence.length ? <ul>{profile.evidence.map((item, index) => <li key={`${item.kind}-${index}`}><span className="badge badge-neutral">Sample (fictional)</span> {item.text}</li>)}</ul> : <p>{draftPreview ? 'No work examples selected for public display.' : 'No public work examples have been approved.'}</p>}<p className="muted">{draftPreview ? 'Draft last saved' : 'Last confirmed'} {profile.lastUpdated.slice(0, 10)}</p>{children}</article>;
}
