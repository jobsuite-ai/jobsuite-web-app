import { JobStatus } from './model';

export interface ColumnConfig {
    id: string;
    title: string;
    statuses: JobStatus[];
    defaultStatus: JobStatus;
}

const SETTINGS_STORAGE_KEY = 'jobsuite_column_settings';

export function getDefaultColumns(): ColumnConfig[] {
    return [
        {
            id: 'estimate-needed',
            title: 'Estimate Needed',
            statuses: ['ESTIMATE_NEEDED' as JobStatus],
            defaultStatus: 'ESTIMATE_NEEDED' as JobStatus,
        },
        {
            id: 'scheduling',
            title: 'Scheduling',
            statuses: ['ESTIMATE_SCHEDULED' as JobStatus],
            defaultStatus: 'ESTIMATE_SCHEDULED' as JobStatus,
        },
        {
            id: 'in-progress',
            title: 'In Progress',
            statuses: ['ESTIMATE_COMPLETED' as JobStatus, 'IN_PROGRESS' as JobStatus],
            defaultStatus: 'ESTIMATE_COMPLETED' as JobStatus,
        },
        {
            id: 'proposal',
            title: 'Proposal',
            statuses: ['PROPOSAL_SENT' as JobStatus, 'PROPOSAL_APPROVED' as JobStatus],
            defaultStatus: 'PROPOSAL_SENT' as JobStatus,
        },
        {
            id: 'scheduled',
            title: 'Scheduled',
            statuses: ['SCHEDULED' as JobStatus],
            defaultStatus: 'SCHEDULED' as JobStatus,
        },
        {
            id: 'completed',
            title: 'Completed',
            statuses: ['COMPLETED' as JobStatus, 'INVOICED' as JobStatus, 'PAID' as JobStatus],
            defaultStatus: 'COMPLETED' as JobStatus,
        },
        {
            id: 'cancelled',
            title: 'Cancelled',
            statuses: ['CANCELLED' as JobStatus],
            defaultStatus: 'CANCELLED' as JobStatus,
        },
    ];
}

export function loadColumnSettings(): ColumnConfig[] {
    if (typeof window === 'undefined') {
        return getDefaultColumns();
    }

    try {
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Validate the structure
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed as ColumnConfig[];
            }
        }
    } catch (error) {
        console.error('Error loading column settings:', error);
    }

    return getDefaultColumns();
}

export function saveColumnSettings(columns: ColumnConfig[]): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(columns));
    } catch (error) {
        console.error('Error saving column settings:', error);
    }
}
