import { JobStatus } from './model';

export const BADGE_COLORS = {
    SUCCESS: '#7DBA84',
    WARNING: '#EAC67A',
    ERROR: '#E58D8D',
    INFO: '#72A1D1',
    ALERT: '#E0A56D',
  } as const;

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
