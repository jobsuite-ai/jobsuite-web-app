import { JobStatus } from './model'

export const getBadgeColor = (jobStatus: JobStatus) => {
    switch (jobStatus) {
        case JobStatus.COMPLETED:
            return 'green';
        case JobStatus.IN_PROGRESS:
            return '#90EE90';
        case JobStatus.ESTIMATE_ACCEPTED:
            return 'green';
        case JobStatus.ESTIMATE_DECLINED:
            return '#FF7F7F';
        case JobStatus.ESTIMATE_SENT:
            return '#D3D3D3';
        case JobStatus.ESTIMATE_OPENED:
            return '#D3D3D3';
        case JobStatus.PENDING_ESTIMATE:
            return '#D3D3D3';
        default:
            return "#D3D3D3";
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
