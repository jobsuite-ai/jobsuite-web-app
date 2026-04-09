import type { Estimate, User } from '@/components/Global/model';
import type { TeamAssignmentPools } from '@/hooks/useTeamAssignmentPools';

export function userDisplayLabel(u: User): string {
  const base = (u.full_name && String(u.full_name).trim()) || u.email || u.id;
  return u.invitation_status === 'pending_invite' ? `${base} (pending)` : base;
}

export function crewLeadPoolOptions(
  pools: TeamAssignmentPools,
  users: User[]
): { value: string; label: string }[] {
  return pools.leadPainterUserIds.map((id) => {
    const u = users.find((x) => x.id === id);
    return { value: id, label: u ? userDisplayLabel(u) : id };
  });
}

export function productionManagerPoolOptions(
  pools: TeamAssignmentPools,
  users: User[]
): { value: string; label: string }[] {
  return pools.productionManagerUserIds.map((id) => {
    const u = users.find((x) => x.id === id);
    return { value: id, label: u ? userDisplayLabel(u) : id };
  });
}

export function salesPersonPoolOptions(
  pools: TeamAssignmentPools,
  users: User[]
): { value: string; label: string }[] {
  return pools.salesPersonUserIds.map((id) => {
    const u = users.find((x) => x.id === id);
    return { value: id, label: u ? userDisplayLabel(u) : id };
  });
}

/** Current select value: user id when set on estimate, else legacy name string. */
export function crewLeadSelectValue(estimate: Estimate): string | null {
  const uid = estimate.project_crew_lead_user_id?.trim();
  if (uid) return uid;
  return estimate.project_crew_lead?.trim() || null;
}

export function productionManagerSelectValue(estimate: Estimate): string | null {
  const uid = estimate.production_manager_user_id?.trim();
  if (uid) return uid;
  return estimate.production_manager?.trim() || null;
}

export function salesPersonSelectValue(estimate: Estimate): string | null {
  const uid = estimate.sales_person_user_id?.trim();
  if (uid) return uid;
  return estimate.sales_person?.trim() || null;
}

export function displayCrewLead(estimate: Estimate, users: User[]): string {
  const uid = estimate.project_crew_lead_user_id?.trim();
  if (uid) {
    const u = users.find((x) => x.id === uid);
    return u ? userDisplayLabel(u) : estimate.project_crew_lead || uid;
  }
  return estimate.project_crew_lead || '—';
}

export function displayProductionManager(estimate: Estimate, users: User[]): string {
  const uid = estimate.production_manager_user_id?.trim();
  if (uid) {
    const u = users.find((x) => x.id === uid);
    return u ? userDisplayLabel(u) : estimate.production_manager || uid;
  }
  return estimate.production_manager || '—';
}

export function displaySalesPerson(estimate: Estimate, users: User[]): string {
  const uid = estimate.sales_person_user_id?.trim();
  if (uid) {
    const u = users.find((x) => x.id === uid);
    return u ? userDisplayLabel(u) : estimate.sales_person || uid;
  }
  return estimate.sales_person || '—';
}
