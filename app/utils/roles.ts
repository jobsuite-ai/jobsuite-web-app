/**
 * Field-worker / painter roles (legacy `employee` plus lead and support painters).
 * Keep in sync with `UserRole` in job-engine `app/domain/models/user.py`.
 */
export const PAINTER_ROLE_STRINGS = ['employee', 'lead-painter', 'support-painter'] as const;

export type PainterRoleString = (typeof PAINTER_ROLE_STRINGS)[number];

const PAINTER_ROLE_SET = new Set<string>(PAINTER_ROLE_STRINGS);

export function isPainterRole(role: string | null | undefined): boolean {
  if (!role) {
    return false;
  }
  return PAINTER_ROLE_SET.has(role);
}

/** Lead-equivalent: legacy employee or explicit lead-painter. */
export function isLeadPainter(role: string | null | undefined): boolean {
  return role === 'lead-painter' || role === 'employee';
}

export function isSupportPainter(role: string | null | undefined): boolean {
  return role === 'support-painter';
}

/**
 * Map stored/API role to lead vs support for UI that only distinguishes those two.
 * Legacy `employee` is treated as lead (matches migration default to lead-painter).
 */
export function normalizePainterRole(
  role: string | null | undefined
): 'lead-painter' | 'support-painter' | null {
  if (!role) {
    return null;
  }
  if (role === 'support-painter') {
    return 'support-painter';
  }
  if (role === 'employee' || role === 'lead-painter') {
    return 'lead-painter';
  }
  return null;
}
