import { JobStatus } from './model'

export const getBadgeColor = (jobStatus: JobStatus) => {
    switch (jobStatus) {
        case JobStatus.COMPLETED:
            return '#4CAF50';
        case JobStatus.IN_PROGRESS:
            return '#2196F3';
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
        default:
            return "#d3d3d3";
    }
}

export const getFormattedStatus = (jobStatus: JobStatus) => {
    switch (jobStatus) {
        case JobStatus.COMPLETED:
            return 'Completed';
        case JobStatus.IN_PROGRESS:
            return 'In Progress';
        case JobStatus.ESTIMATE_ACCEPTED:
            return 'Estimate Accepted';
        case JobStatus.ESTIMATE_DECLINED:
            return 'Estimate Declined';
        case JobStatus.ESTIMATE_SENT:
            return 'Estimate Sent';
        case JobStatus.ESTIMATE_OPENED:
            return 'Client Opened Estimate';
        case JobStatus.PENDING_ESTIMATE:
            return 'Estimate Not Finished';
        default:
            return "Estimate Not Finished";
    }
}
