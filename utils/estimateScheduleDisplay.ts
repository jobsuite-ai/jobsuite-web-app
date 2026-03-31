import type { Estimate } from '@/components/Global/model';
import { EstimateStatus } from '@/components/Global/model';

/**
 * Start date shown in the UI for project scheduling. While status is PROJECT_NOT_SCHEDULED,
 * we treat the job as having no start date yet (Dynamo may still carry a legacy default
 * `scheduled_date` from record creation).
 */
export function effectiveProjectStartDate(estimate: Estimate): Date | null {
  if (estimate.status === EstimateStatus.PROJECT_NOT_SCHEDULED) {
    return null;
  }
  return estimate.scheduled_date ? new Date(estimate.scheduled_date) : null;
}
