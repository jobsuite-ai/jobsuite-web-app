export function apiEstimateType(et: string | undefined): string {
  const u = String(et || '').toUpperCase();
  if (u.includes('EXTERIOR') && u.includes('INTERIOR')) return 'BOTH';
  if (u.includes('EXTERIOR')) return 'EXTERIOR';
  if (u.includes('INTERIOR')) return 'INTERIOR';
  if (u.includes('FULL')) return 'BOTH';
  return 'INTERIOR';
}
