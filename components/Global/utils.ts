import { JobStatus } from './model'

export const getBadgeColor = (jobStatus: JobStatus) => {
    switch (jobStatus) {
        case JobStatus.ESTIMATE_NOT_SCHEDULED:
            return '#3F51B5';
        case JobStatus.ESTIMATE_ACCEPTED:
            return '#FF9800';
        case JobStatus.ESTIMATE_DECLINED:
            return '#F44336';
        case JobStatus.ESTIMATE_SENT:
            return '#FFC107';
        case JobStatus.ESTIMATE_OPENED:
            return '#3F51B5';
        case JobStatus.PENDING_ESTIMATE:
            return '#d3d3d3';
        case JobStatus.RLPP_SIGNED:
            return '#4CAF50';
        case JobStatus.RLPP_DECLINED:
            return '#F44336';
        case JobStatus.RLPP_OPENED:
            return '#3F51B5';
        default:
            return "#d3d3d3";
    }
}

export const getFormattedStatus = (jobStatus: JobStatus) => {
    switch (jobStatus) {
        case JobStatus.ESTIMATE_NOT_SCHEDULED:
            return 'Estimate Not Scheduled';
        case JobStatus.ESTIMATE_ACCEPTED:
            return 'Needs RLPP Signature';
        case JobStatus.ESTIMATE_DECLINED:
            return 'Estimate Declined';
        case JobStatus.ESTIMATE_SENT:
            return 'Estimate Sent';
        case JobStatus.ESTIMATE_OPENED:
            return 'Client Opened Estimate';
        case JobStatus.PENDING_ESTIMATE:
            return 'Estimate Not Finished';
        case JobStatus.RLPP_SIGNED:
            return 'Estimate Finished';
        case JobStatus.RLPP_DECLINED:
            return 'RLPP Declined';
        case JobStatus.RLPP_OPENED:
            return 'RLPP Opened';
        default:
            return "Estimate Not Finished";
    }
}
