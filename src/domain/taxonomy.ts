export const CREATIVE_DOMAINS = [
  'Audiovisual Media',
  'Digital Interactive Media',
  'Creative Services',
  'Design',
  'Publishing and Printed Media',
  'Performing Arts',
  'Visual Arts',
  'Traditional Cultural Expressions',
  'Cultural Sites',
] as const;

export type CreativeDomain = (typeof CREATIVE_DOMAINS)[number];

export function isCreativeDomain(value: string): value is CreativeDomain {
  return (CREATIVE_DOMAINS as readonly string[]).includes(value);
}
