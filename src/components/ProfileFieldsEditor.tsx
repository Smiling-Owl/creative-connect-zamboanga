import { useState } from 'react';
import { Button } from './ui';
import { CREATIVE_DOMAINS } from '../domain/taxonomy';
import type { IntakeFields } from '../domain/types';

const GENERAL_LOCATIONS = ['Area 1 (broad, fictional)', 'Area 2 (broad, fictional)', 'Area 3 (broad, fictional)'];

export interface ProfileFieldError {
  field: string;
  message: string;
}

export function focusProfileField(field: string) {
  const targetId = ({ name: 'profile-name', displayName: 'profile-display-name', domain: 'profile-domain', practice: 'profile-practice', skills: 'profile-skills', area: 'profile-area', interests: 'profile-interests', followUp: 'profile-follow-up', evidence: 'profile-evidence', acknowledged: 'profile-acknowledged' } as Record<string, string>)[field];
  const target = document.getElementById(targetId ?? '') ?? (field === 'evidence' ? document.getElementById('profile-add-evidence') : null);
  target?.focus();
}

export function ProfileFieldsEditor({
  fields,
  onChange,
  coordinatorId,
  errors = [],
}: {
  fields: IntakeFields;
  onChange: (fields: IntakeFields) => void;
  /** When set, the assisted editor may select coordinator follow-up; its id is never user-entered. */
  coordinatorId?: string;
  errors?: ProfileFieldError[];
}) {
  const [skillsText, setSkillsText] = useState(fields.skills.join(', '));
  const [interestsText, setInterestsText] = useState(fields.interests.join(', '));
  const update = (patch: Partial<IntakeFields>) => onChange({ ...fields, ...patch });
  const addEvidence = () => update({ evidence: [...fields.evidence, { id: `profile-${window.crypto.randomUUID()}`, kind: 'sample', text: '', publicApproved: false }] });
  const removeEvidence = (evidenceId: string) => update({ evidence: fields.evidence.filter((item) => item.id !== evidenceId) });
  return <section className="public-card">
    <h2>Edit profile details</h2>
    <p>Practice, skills, work evidence, display name, domain, and general location can require renewed council review. Contact preference and listing choice do not require content approval.</p>
    {errors.length ? <div role="alert" className="notice notice-warning"><h3>Check these fields before saving</h3><ul>{errors.map((error) => <li key={error.field}><button type="button" className="text-button" onClick={() => focusProfileField(error.field)}>{error.message}</button></li>)}</ul></div> : null}
    <label className="field-inline">Name for council record · private<input id="profile-name" value={fields.name} onChange={(event) => update({ name: event.target.value })} /></label>
    <label className="field-inline">Public display name · council review<input id="profile-display-name" value={fields.displayName} onChange={(event) => update({ displayName: event.target.value })} /></label>
    <label className="field-inline">Creative domain · council review<select id="profile-domain" value={fields.domain} onChange={(event) => update({ domain: event.target.value })}>{CREATIVE_DOMAINS.map((domain) => <option key={domain}>{domain}</option>)}</select></label>
    <label className="field-inline">Specific creative practice · council review<textarea id="profile-practice" rows={2} value={fields.practice} onChange={(event) => update({ practice: event.target.value })} /></label>
    <label className="field-inline">Skills · council review, separated by commas<input id="profile-skills" value={skillsText} onChange={(event) => { setSkillsText(event.target.value); update({ skills: event.target.value.split(',') }); }} /></label>
    <label className="field-inline">General location · council review<select id="profile-area" aria-describedby="profile-area-help" value={fields.area} onChange={(event) => update({ area: event.target.value })}><option value="">Choose a general location</option>{fields.area && !GENERAL_LOCATIONS.includes(fields.area) ? <option>{fields.area}</option> : null}{GENERAL_LOCATIONS.map((area) => <option key={area}>{area}</option>)}</select><span id="profile-area-help" className="field-hint">Choose a broad area. Do not enter a street address.</span></label>
    <label className="field-inline">Support interests · private, separated by commas<input id="profile-interests" value={interestsText} onChange={(event) => { setInterestsText(event.target.value); update({ interests: event.target.value.split(',') }); }} /></label>
    {fields.followUp.kind === 'coordinator_mediated' && !coordinatorId
      ? <p id="profile-follow-up" tabIndex={-1}>Coordinator-mediated follow-up is arranged by {fields.followUp.coordinatorId}. Ask your coordinator for help if this arrangement needs to change.</p>
      : <><label className="field-inline">Follow-up arrangement · not a public field<select id="profile-follow-up" value={fields.followUp.kind} onChange={(event) => update({ followUp: event.target.value === 'coordinator_mediated' && coordinatorId ? { kind: 'coordinator_mediated', coordinatorId } : { kind: 'own_channel', channelLabel: fields.followUp.kind === 'own_channel' ? fields.followUp.channelLabel : '' } })}><option value="own_channel">Person’s own channel</option>{coordinatorId ? <option value="coordinator_mediated">Coordinator-mediated by me</option> : null}</select></label>{fields.followUp.kind === 'own_channel' ? <label className="field-inline">Contact preference · not council-reviewed<input value={fields.followUp.channelLabel} onChange={(event) => update({ followUp: { kind: 'own_channel', channelLabel: event.target.value } })} /></label> : <p>Coordinator-mediated follow-up is assigned to {coordinatorId}.</p>}</>}
    <h3>Work evidence · council review</h3>
    {fields.evidence.map((item, index) => <div className="readback-group" key={item.id}>
      <label className="field-inline">Evidence type<select value={item.kind} onChange={(event) => update({ evidence: fields.evidence.map((entry, i) => i === index ? { ...entry, kind: event.target.value as typeof item.kind } : entry) })}><option value="link">Link</option><option value="sample">Sample</option><option value="assisted_description">Assisted description</option></select></label>
      <label className="field-inline">Evidence description<input id={index === 0 ? 'profile-evidence' : undefined} value={item.text} onChange={(event) => update({ evidence: fields.evidence.map((entry, i) => i === index ? { ...entry, text: event.target.value } : entry) })} /></label>
      <label><input type="checkbox" checked={item.publicApproved} onChange={(event) => update({ evidence: fields.evidence.map((entry, i) => i === index ? { ...entry, publicApproved: event.target.checked } : entry) })} /> May appear in public profile</label>
      <Button variant="secondary" onClick={() => removeEvidence(item.id)}>Remove evidence</Button>
    </div>)}
    <button id="profile-add-evidence" type="button" className="btn btn-secondary" onClick={addEvidence}>Add work evidence</button>
    <label className="choice-row"><input id="profile-acknowledged" type="checkbox" checked={fields.acknowledged} onChange={(event) => update({ acknowledged: event.target.checked })} /> I acknowledge the information-use notice</label>
  </section>;
}
