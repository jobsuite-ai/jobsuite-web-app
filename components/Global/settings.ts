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
            statuses: ['PROJECT_NOT_SCHEDULED' as JobStatus],
            defaultStatus: 'PROJECT_NOT_SCHEDULED' as JobStatus,
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
            statuses: ['PROJECT_IN_PROGRESS' as JobStatus],
            defaultStatus: 'PROJECT_IN_PROGRESS' as JobStatus,
        },
        {
            id: 'billing-needed',
            title: 'Billing Needed',
            statuses: ['PROJECT_BILLING_NEEDED' as JobStatus],
            defaultStatus: 'PROJECT_BILLING_NEEDED' as JobStatus,
        },
        {
            id: 'accounts-receivable',
            title: 'Accounts Receivable',
            statuses: ['PROJECT_ACCOUNTS_RECEIVABLE' as JobStatus],
            defaultStatus: 'PROJECT_ACCOUNTS_RECEIVABLE' as JobStatus,
        },
        {
            id: 'payments-received',
            title: 'Payments Received',
            statuses: ['PROJECT_PAYMENTS_RECEIVED' as JobStatus],
            defaultStatus: 'PROJECT_PAYMENTS_RECEIVED' as JobStatus,
        },
        {
            id: 'historical',
            title: 'Historical',
            statuses: ['PROJECT_COMPLETED' as JobStatus],
            defaultStatus: 'PROJECT_COMPLETED' as JobStatus,
        },
    ];
}

export function loadColumnSettings(): ColumnConfig[] {
    if (typeof window === 'undefined') {
        return getDefaultColumns();
    }
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
        const parsed = JSON.parse(saved);
        // Validate the structure
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed as ColumnConfig[];
        }
    }

    return getDefaultColumns();
}

export function saveColumnSettings(columns: ColumnConfig[]): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(columns));
}
