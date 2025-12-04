import { EstimateStatus } from './model';

export const BADGE_COLORS = {
    SUCCESS: '#7DBA84',
    WARNING: '#EAC67A',
    ERROR: '#E58D8D',
    INFO: '#72A1D1',
    ALERT: '#E0A56D',
} as const;

export const LIST_BACKGROUND_COLOR = '#7DA0F0';

// Duplicate for EstimateStatus
export const getEstimateBadgeColor = (estimateStatus: EstimateStatus) => {
    switch (estimateStatus) {
        case EstimateStatus.NEW_LEAD:
            return BADGE_COLORS.ERROR;
        case EstimateStatus.ESTIMATE_NOT_SCHEDULED:
            return BADGE_COLORS.WARNING;
        case EstimateStatus.ESTIMATE_SCHEDULED:
            return BADGE_COLORS.ALERT;
        case EstimateStatus.ESTIMATE_IN_PROGRESS:
            return BADGE_COLORS.SUCCESS;
        case EstimateStatus.NEEDS_FOLLOW_UP:
            return BADGE_COLORS.WARNING;
        case EstimateStatus.ESTIMATE_ACCEPTED:
            return BADGE_COLORS.ERROR;
        case EstimateStatus.ESTIMATE_DECLINED:
            return BADGE_COLORS.ERROR;
        case EstimateStatus.ESTIMATE_SENT:
            return BADGE_COLORS.WARNING;
        case EstimateStatus.ESTIMATE_OPENED:
            return BADGE_COLORS.INFO;
        case EstimateStatus.CONTRACTOR_OPENED:
            return BADGE_COLORS.ALERT;
        case EstimateStatus.CONTRACTOR_DECLINED:
            return BADGE_COLORS.ERROR;
        case EstimateStatus.CONTRACTOR_SIGNED:
            return BADGE_COLORS.SUCCESS;
        case EstimateStatus.STALE_ESTIMATE:
            return BADGE_COLORS.ALERT;
        case EstimateStatus.ARCHIVED:
            return '#d3d3d3';
        case EstimateStatus.ACCOUNTING_NEEDED:
            return BADGE_COLORS.WARNING;
        case EstimateStatus.PROJECT_NOT_SCHEDULED:
            return BADGE_COLORS.WARNING;
        case EstimateStatus.PROJECT_SCHEDULED:
            return BADGE_COLORS.INFO;
        case EstimateStatus.PROJECT_IN_PROGRESS:
            return BADGE_COLORS.SUCCESS;
        case EstimateStatus.PROJECT_BILLING_NEEDED:
            return BADGE_COLORS.WARNING;
        case EstimateStatus.PROJECT_ACCOUNTS_RECEIVABLE:
            return BADGE_COLORS.INFO;
        case EstimateStatus.PROJECT_PAYMENTS_RECEIVED:
            return BADGE_COLORS.SUCCESS;
        case EstimateStatus.PROJECT_COMPLETED:
            return BADGE_COLORS.SUCCESS;
        case EstimateStatus.PROJECT_CANCELLED:
            return BADGE_COLORS.ERROR;
        default:
            return '#d3d3d3';
    }
};

export const getFormattedEstimateStatus = (estimateStatus: EstimateStatus) => {
    switch (estimateStatus) {
        case EstimateStatus.NEW_LEAD:
            return 'New Lead';
        case EstimateStatus.ESTIMATE_SCHEDULED:
            return 'Estimate Scheduled';
        case EstimateStatus.ESTIMATE_IN_PROGRESS:
            return 'Estimate In Progress';
        case EstimateStatus.NEEDS_FOLLOW_UP:
            return 'Needs Follow Up';
        case EstimateStatus.ESTIMATE_NOT_SCHEDULED:
            return 'Needs Scheduling';
        case EstimateStatus.ESTIMATE_ACCEPTED:
            return 'Needs Contractor Signature';
        case EstimateStatus.ESTIMATE_DECLINED:
            return 'Estimate Declined';
        case EstimateStatus.ESTIMATE_SENT:
            return 'Estimate Sent';
        case EstimateStatus.ESTIMATE_OPENED:
            return 'Client Opened Estimate';
        case EstimateStatus.CONTRACTOR_OPENED:
            return 'Contractor Viewed Estimate';
        case EstimateStatus.CONTRACTOR_DECLINED:
            return 'Contractor Rejected';
        case EstimateStatus.CONTRACTOR_SIGNED:
            return 'Contractor Signed';
        case EstimateStatus.STALE_ESTIMATE:
            return 'Stale Estimate';
        case EstimateStatus.ARCHIVED:
            return 'Archived';
        case EstimateStatus.ACCOUNTING_NEEDED:
            return 'Accounting Needed';
        case EstimateStatus.PROJECT_NOT_SCHEDULED:
            return 'Project Not Scheduled';
        case EstimateStatus.PROJECT_SCHEDULED:
            return 'Project Scheduled';
        case EstimateStatus.PROJECT_IN_PROGRESS:
            return 'Project In Progress';
        case EstimateStatus.PROJECT_BILLING_NEEDED:
            return 'Project Billing Needed';
        case EstimateStatus.PROJECT_ACCOUNTS_RECEIVABLE:
            return 'Project Accounts Receivable';
        case EstimateStatus.PROJECT_PAYMENTS_RECEIVED:
            return 'Project Payments Received';
        case EstimateStatus.PROJECT_COMPLETED:
            return 'Project Completed';
        case EstimateStatus.PROJECT_CANCELLED:
            return 'Project Cancelled';
        default:
            return 'Estimate Not Finished';
    }
};
