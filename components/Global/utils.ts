import { EstimateStatus, JobStatus } from './model';

export const BADGE_COLORS = {
    SUCCESS: '#7DBA84',
    WARNING: '#EAC67A',
    ERROR: '#E58D8D',
    INFO: '#72A1D1',
    ALERT: '#E0A56D',
} as const;

export const LIST_BACKGROUND_COLOR = '#7DA0F0';

export const getBadgeColor = (jobStatus: JobStatus) => {
    switch (jobStatus) {
        case JobStatus.NEW_LEAD:
            return BADGE_COLORS.ERROR;
        case JobStatus.ESTIMATE_NOT_SCHEDULED:
            return BADGE_COLORS.WARNING;
        case JobStatus.ESTIMATE_SCHEDULED:
            return BADGE_COLORS.ALERT;
        case JobStatus.ESTIMATE_IN_PROGRESS:
            return BADGE_COLORS.SUCCESS;
        case JobStatus.NEEDS_FOLLOW_UP:
            return BADGE_COLORS.ERROR;
        case JobStatus.ESTIMATE_ACCEPTED:
            return BADGE_COLORS.SUCCESS;
        case JobStatus.ESTIMATE_DECLINED:
            return BADGE_COLORS.ERROR;
        case JobStatus.ESTIMATE_SENT:
            return BADGE_COLORS.WARNING;
        case JobStatus.ESTIMATE_OPENED:
            return BADGE_COLORS.INFO;
        case JobStatus.RLPP_SIGNED:
            return BADGE_COLORS.SUCCESS;
        case JobStatus.RLPP_DECLINED:
            return BADGE_COLORS.ERROR;
        case JobStatus.RLPP_OPENED:
            return BADGE_COLORS.ERROR;
        case JobStatus.JOB_COMPLETE:
            return BADGE_COLORS.SUCCESS;
        default:
            return '#d3d3d3';
    }
};

export const getFormattedStatus = (jobStatus: JobStatus) => {
    switch (jobStatus) {
        case JobStatus.NEW_LEAD:
            return 'New Lead';
        case JobStatus.ESTIMATE_SCHEDULED:
            return 'Estimate Scheduled';
        case JobStatus.ESTIMATE_IN_PROGRESS:
            return 'Estimate In Progress';
        case JobStatus.NEEDS_FOLLOW_UP:
            return 'Needs Follow Up';
        case JobStatus.ESTIMATE_NOT_SCHEDULED:
            return 'Needs Scheduling';
        case JobStatus.ESTIMATE_ACCEPTED:
            return 'Needs RLPP Signature';
        case JobStatus.ESTIMATE_DECLINED:
            return 'Estimate Declined';
        case JobStatus.ESTIMATE_SENT:
            return 'Estimate Sent';
        case JobStatus.ESTIMATE_OPENED:
            return 'Client Opened Estimate';
        case JobStatus.RLPP_SIGNED:
            return 'Estimate Finished';
        case JobStatus.RLPP_DECLINED:
            return 'RLPP Declined';
        case JobStatus.RLPP_OPENED:
            return 'RLPP Opened';
        case JobStatus.JOB_COMPLETE:
            return 'Job Complete';
        case JobStatus.ARCHIVED:
            return 'Archived';
        default:
            return 'Estimate Not Finished';
    }
};

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
        default:
            return 'Estimate Not Finished';
    }
};
