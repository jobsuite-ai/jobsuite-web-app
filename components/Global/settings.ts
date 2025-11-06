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
            id: 'accounting-needed',
            title: 'Accounting Needed',
            statuses: ['ACCOUNTING_NEEDED' as JobStatus],
            defaultStatus: 'ACCOUNTING_NEEDED' as JobStatus,
        },
        {
            id: 'scheduling',
            title: 'Scheduling',
            statuses: ['ESTIMATE_SCHEDULED' as JobStatus],
            defaultStatus: 'ESTIMATE_SCHEDULED' as JobStatus,
        },
        {
            id: 'project-scheduled',
            title: 'Project Scheduled',
            statuses: ['PROJECT_SCHEDULED' as JobStatus],
            defaultStatus: 'PROJECT_SCHEDULED' as JobStatus,
        },
        {
            id: 'in-progress',
            title: 'In Progress',
            statuses: ['ESTIMATE_COMPLETED' as JobStatus, 'IN_PROGRESS' as JobStatus],
            defaultStatus: 'ESTIMATE_COMPLETED' as JobStatus,
        },
        {
            id: 'billing-needed',
            title: 'Billing Needed',
            statuses: ['BILLING_NEEDED' as JobStatus],
            defaultStatus: 'BILLING_NEEDED' as JobStatus,
        },
        {
            id: 'invoiced',
            title: 'Invoiced',
            statuses: ['INVOICED' as JobStatus],
            defaultStatus: 'INVOICED' as JobStatus,
        },
        {
            id: 'historical',
            title: 'Historical',
            statuses: ['ARCHIVED' as JobStatus],
            defaultStatus: 'ARCHIVED' as JobStatus,
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
