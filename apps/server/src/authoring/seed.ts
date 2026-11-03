export type SeedOutcome =
  { readonly state: 'seeded' } | { readonly state: 'refused'; readonly reason: string };

export function seedSource(_packageDir: string, _sourceDir: string): SeedOutcome {
  throw new Error('not implemented');
}
