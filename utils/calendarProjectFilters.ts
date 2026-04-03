import { Estimate, EstimateStatus } from '@/components/Global/model';

/**
 * Project pipeline statuses for the scheduling calendar (excludes terminal / pre-job).
 */
const PROJECT_PIPELINE_STATUSES = new Set<string>([
  EstimateStatus.CONTRACTOR_SIGNED,
  EstimateStatus.ACCOUNTING_NEEDED,
  EstimateStatus.PROJECT_NOT_SCHEDULED,
  EstimateStatus.PROJECT_SCHEDULED,
  EstimateStatus.PROJECT_IN_PROGRESS,
  EstimateStatus.PROJECT_BILLING_NEEDED,
  EstimateStatus.PROJECT_ACCOUNTS_RECEIVABLE,
  EstimateStatus.PROJECT_PAYMENTS_RECEIVED,
]);

/** Extra proposal/sold statuses that can appear on the calendar when they have a start date. */
const CALENDAR_EXTRA_STATUSES = new Set<string>([
  EstimateStatus.ESTIMATE_ACCEPTED,
  EstimateStatus.ESTIMATE_SCHEDULED,
  EstimateStatus.ESTIMATE_IN_PROGRESS,
  EstimateStatus.CONTRACTOR_OPENED,
]);

export function isProjectPipelineStatus(status: string): boolean {
  return PROJECT_PIPELINE_STATUSES.has(status);
}

function isTerminalCalendarStatus(status: string): boolean {
  return (
    status === EstimateStatus.ARCHIVED ||
    status === EstimateStatus.PROJECT_COMPLETED ||
    status === EstimateStatus.PROJECT_CANCELLED ||
    status === EstimateStatus.ESTIMATE_DECLINED ||
    status === EstimateStatus.CONTRACTOR_DECLINED
  );
}

/** Dynamo/API may send 1 for is_project (stored as Number in DynamoDB). */
function isProjectFlag(estimate: Estimate): boolean {
  const v = estimate.is_project;
  if (v === true || v === 1) {
    return true;
  }
  return String(v ?? '') === '1';
}

function hasScheduledDate(estimate: Estimate): boolean {
  const s = estimate.scheduled_date;
  return typeof s === 'string' && s.trim().length > 0;
}

/** Shown on the calendar grid: scheduled project work (not “not scheduled” column). */
export function isCalendarScheduledProject(estimate: Estimate): boolean {
  if (estimate.status === EstimateStatus.PROJECT_NOT_SCHEDULED) {
    return false;
  }
  if (isTerminalCalendarStatus(estimate.status)) {
    return false;
  }
  if (!hasScheduledDate(estimate)) {
    return false;
  }
  if (isProjectPipelineStatus(estimate.status)) {
    return true;
  }
  if (CALENDAR_EXTRA_STATUSES.has(estimate.status)) {
    return true;
  }
  if (isProjectFlag(estimate)) {
    return true;
  }
  return false;
}

/**
 * Jobs that still need a calendar start: PROJECT_NOT_SCHEDULED status.
 * (We cannot rely on `scheduled_date` being empty — the API often defaults it at creation.)
 */
export function isUnscheduledPipelineProject(estimate: Estimate): boolean {
  return estimate.status === EstimateStatus.PROJECT_NOT_SCHEDULED;
}

/**
 * PROJECT_NOT_SCHEDULED and no production team assigned yet (calendar “Not assigned yet”).
 */
export function isUnassignedTeamProject(estimate: Estimate): boolean {
  if (estimate.status !== EstimateStatus.PROJECT_NOT_SCHEDULED) {
    return false;
  }
  const tid = estimate.schedule_team_id;
  return tid == null || String(tid).trim() === '';
}
