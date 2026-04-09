import { useMemo } from 'react';

import type { User } from '@/components/Global/model';
import { useUsers } from '@/hooks/useUsers';

export const PRODUCTION_MANAGER_ROLE = 'production_manager';
export const SALES_PERSON_ROLE = 'sales_person';
export const OFFICE_MANAGER_ROLE = 'office_manager';

/** Single-select job role options for roster. Crew lead uses login Role, not this list. */
export const TEAM_ASSIGNMENT_ROLE_OPTIONS = [
  { value: PRODUCTION_MANAGER_ROLE, label: 'Production manager' },
  { value: SALES_PERSON_ROLE, label: 'Sales' },
  { value: OFFICE_MANAGER_ROLE, label: 'Office manager' },
] as const;

function hasAssignmentRole(u: User, role: string): boolean {
  return Array.isArray(u.team_assignment_roles) && u.team_assignment_roles.includes(role);
}

/** Who can be assigned as job crew lead on estimates (login role). */
function isCrewLeadPoolMember(u: User): boolean {
  const r = u.role;
  return r === 'lead-painter' || r === 'support-painter';
}

export interface TeamAssignmentPools {
  leadPainterUserIds: string[];
  productionManagerUserIds: string[];
  salesPersonUserIds: string[];
  officeManagerUserIds: string[];
}

/**
 * Sidebar pools: crew leads from login role (lead-painter / support-painter);
 * other roles from `team_assignment_roles` on each user.
 */
export function useTeamAssignmentPools(): TeamAssignmentPools & { loading: boolean } {
  const { users, loading } = useUsers();

  return useMemo(() => {
    const roster = users.filter((u) => u.role !== 'client');
    return {
      leadPainterUserIds: roster.filter(isCrewLeadPoolMember).map((u) => u.id),
      productionManagerUserIds: roster
        .filter((u) => hasAssignmentRole(u, PRODUCTION_MANAGER_ROLE))
        .map((u) => u.id),
      salesPersonUserIds: roster
        .filter((u) => hasAssignmentRole(u, SALES_PERSON_ROLE))
        .map((u) => u.id),
      officeManagerUserIds: roster
        .filter((u) => hasAssignmentRole(u, OFFICE_MANAGER_ROLE))
        .map((u) => u.id),
      loading,
    };
  }, [users, loading]);
}
