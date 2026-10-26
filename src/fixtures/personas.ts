import type { Actor } from '../domain/types';

// Demo personas. All are fictional. Selecting one only changes the demo session; it is not a login.

export interface Persona {
  id: string;
  label: string;
  description: string;
  actor: Actor;
}

export const PERSONAS: Persona[] = [
  {
    id: 'guest',
    label: 'Guest visitor',
    description: 'Public visitor: directory, opportunities, guidance.',
    actor: { role: 'guest', id: 'guest' },
  },
  {
    id: 'mika',
    label: 'Mika (fictional illustrator)',
    description: 'No account yet. Her record is being registered by Site A.',
    actor: { role: 'creative', id: 'person-mika' },
  },
  {
    id: 'jun',
    label: 'Jun (fictional video editor)',
    description: 'Self-service creative with a draft in progress.',
    actor: { role: 'creative', id: 'person-jun' },
  },
  {
    id: 'rhea',
    label: 'Rhea (fictional designer, verified)',
    description: 'Verified and listed. Has an offer and a recorded outcome.',
    actor: { role: 'creative', id: 'person-rhea' },
  },
  {
    id: 'noel',
    label: 'Noel (fictional filmmaker, verified)',
    description: 'Self-service, verified, listed. Expressed interest in a workshop.',
    actor: { role: 'creative', id: 'person-noel' },
  },
  {
    id: 'coord-a',
    label: 'Coordinator — Demo Site A',
    description: 'Assigned to the fictional barangay hall site only.',
    actor: { role: 'coordinator', id: 'coord-a', siteId: 'site-a' },
  },
  {
    id: 'coord-b',
    label: 'Coordinator — Demo Site B',
    description: 'Assigned to the fictional school site only.',
    actor: { role: 'coordinator', id: 'coord-b', siteId: 'site-b' },
  },
  {
    id: 'council',
    label: 'Council administrator (fictional)',
    description: 'Reviews records, manages opportunities and referrals.',
    actor: { role: 'council', id: 'council-1' },
  },
];

export const DEFAULT_PERSONA_ID = 'guest';

export function personaById(id: string): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0]!;
}
