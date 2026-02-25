export type Client = {
    address: string;
    city: string;
    state: string;
    zip_code: string;
    email: string;
    name: string;
    client_name: string;
    phone_number: string;
    user_id: string;
    id: string;
    jobs: string[];
};

export type DynamoClient = {
    email: TypedDynamoStringReturn;
    name: TypedDynamoStringReturn;
    phone_number: TypedDynamoStringReturn;
    id: TypedDynamoStringReturn;
    jobs: TypedDynamoListReturn<TypedDynamoStringReturn[]>;
    address_street: TypedDynamoStringReturn;
    address_city: TypedDynamoStringReturn;
    address_state: TypedDynamoStringReturn;
    address_zipcode: TypedDynamoStringReturn;
    address_country: TypedDynamoStringReturn;
    created_at: TypedDynamoStringReturn;
    updated_at: TypedDynamoStringReturn;
};

export type SingleJob = {
    title: TypedDynamoStringReturn;
    city: TypedDynamoStringReturn;
    client_address: TypedDynamoStringReturn;
    client_email: TypedDynamoStringReturn;
    client_id: TypedDynamoStringReturn;
    client_name: TypedDynamoStringReturn;
    client_phone_number: TypedDynamoStringReturn;
    description: TypedDynamoStringReturn;
    docuseal_link: TypedDynamoStringReturn;
    estimate_date: TypedDynamoStringReturn;
    estimate_hours: TypedDynamoNumberReturn;
    actual_hours?: TypedDynamoNumberReturn;
    hourly_rate: TypedDynamoNumberReturn;
    id: TypedDynamoStringReturn;
    images: TypedDynamoListReturn<TypedDynamoMapReturn<JobVideo>[]>;
    jira_link: TypedDynamoStringReturn;
    job_type: TypedDynamoStringReturn;
    discount_reason: TypedDynamoStringReturn;
    line_items: TypedDynamoListReturn<TypedDynamoMapReturn<DynamoLineItem>[]>;
    season: TypedDynamoStringReturn;
    spanish_transcription: TypedDynamoStringReturn;
    state: TypedDynamoStringReturn;
    transcription_summary: TypedDynamoStringReturn;
    user_id: TypedDynamoStringReturn;
    video: TypedDynamoMapReturn<JobVideo>;
    pdf?: TypedDynamoMapReturn<JobPdf>;
    zip_code: TypedDynamoStringReturn;
    outlook_event_id?: TypedDynamoStringReturn;
    outlook_event_url?: TypedDynamoStringReturn;
    calendly_event_uri?: TypedDynamoStringReturn;
    calendly_event_url?: TypedDynamoStringReturn;
    calendly_invitee_email?: TypedDynamoStringReturn;
    referral_source?: TypedDynamoStringReturn;
    keep_same_colors?: TypedDynamoBooleanReturn;
    has_existing_paint?: TypedDynamoBooleanReturn;
    paint_details?: TypedDynamoStringReturn;
    project_crew_lead?: TypedDynamoStringReturn;
};

export type SingleLineItem = {
    header: string;
    description: string;
    price: string;
};

export type SingleComment = {
    id: string;
    job_id: string;
    comment_contents: string;
    commenter: string;
    timestamp: string;
    updated_at?: string;
    user_id?: string;
    reactions?: Array<{ user_id: string; emoji: string }>;
};

export type TypedDynamoStringReturn = {
    S: string;
};
export type TypedDynamoBooleanReturn = {
    BOOL: boolean;
};
export type TypedDynamoNumberReturn = {
    N: string;
};
export type TypedDynamoMapReturn<T> = {
    M: T;
};
export type TypedDynamoListReturn<T> = {
    L: T;
};

export type JobVideo = {
    name: TypedDynamoStringReturn,
    size: TypedDynamoNumberReturn,
    lastModified: TypedDynamoNumberReturn
};

export type JobPdf = {
    name: TypedDynamoStringReturn,
    size: TypedDynamoNumberReturn,
    lastModified: TypedDynamoNumberReturn
};

export type DynamoLineItem = {
    id: TypedDynamoStringReturn,
    header: TypedDynamoStringReturn,
    description: TypedDynamoStringReturn,
    price: TypedDynamoNumberReturn,
    hours: TypedDynamoNumberReturn
};

export enum EstimateStatus {
    NEW_LEAD = 'NEW_LEAD',
    ESTIMATE_NOT_SCHEDULED = 'ESTIMATE_NOT_SCHEDULED',
    ESTIMATE_SCHEDULED = 'ESTIMATE_SCHEDULED',
    ESTIMATE_IN_PROGRESS = 'ESTIMATE_IN_PROGRESS',
    NEEDS_FOLLOW_UP = 'NEEDS_FOLLOW_UP',
    ESTIMATE_SENT = 'ESTIMATE_SENT',
    ESTIMATE_OPENED = 'ESTIMATE_OPENED',
    ESTIMATE_DECLINED = 'ESTIMATE_DECLINED',
    ESTIMATE_ACCEPTED = 'ESTIMATE_ACCEPTED',
    STALE_ESTIMATE = 'STALE_ESTIMATE',
    CONTRACTOR_OPENED = 'CONTRACTOR_OPENED',
    CONTRACTOR_DECLINED = 'CONTRACTOR_DECLINED',
    CONTRACTOR_SIGNED = 'CONTRACTOR_SIGNED',
    ACCOUNTING_NEEDED = 'ACCOUNTING_NEEDED',
    PROJECT_NOT_SCHEDULED = 'PROJECT_NOT_SCHEDULED',
    PROJECT_SCHEDULED = 'PROJECT_SCHEDULED',
    PROJECT_IN_PROGRESS = 'PROJECT_IN_PROGRESS',
    PROJECT_BILLING_NEEDED = 'PROJECT_BILLING_NEEDED',
    PROJECT_ACCOUNTS_RECEIVABLE = 'PROJECT_ACCOUNTS_RECEIVABLE',
    PROJECT_PAYMENTS_RECEIVED = 'PROJECT_PAYMENTS_RECEIVED',
    PROJECT_COMPLETED = 'PROJECT_COMPLETED',
    PROJECT_CANCELLED = 'PROJECT_CANCELLED',
    ARCHIVED = 'ARCHIVED',
}

// JobStatus is an alias for EstimateStatus for backward compatibility
export type JobStatus = EstimateStatus | string;

// Job is an alias for Estimate for backward compatibility
export type Job = Estimate;

export enum EstimateType {
    INTERIOR = 'INTERIOR',
    EXTERIOR = 'EXTERIOR',
    BOTH = 'BOTH',
}

export type Estimate = {
    id: string;
    contractor_id: string;
    client_id: string;
    status: EstimateStatus;
    actual_hours: number;
    hourly_rate: number;
    discount_reason?: string;
    hours_bid: number;
    estimate_type: EstimateType | string;
    transcription_summary?: string;
    spanish_transcription?: string;
    notes?: string;
    created_by: string;
    owned_by?: string;
    scheduled_date: string;
    created_at: string;
    updated_at: string;
    discount_percentage?: number;
    tax_rate?: number;
    address_street?: string;
    address_city?: string;
    address_state?: string;
    address_zipcode?: string;
    address_country?: string;
    title?: string;
    client_name?: string; // Added by backend when listing estimates
    video?: any;
    images?: any;
    pdf?: any;
    line_items?: any[];
    docuseal_link?: string;
    jira_link?: string;
    project_crew_lead?: string;
    // Change order fields
    change_orders?: string[];
    original_estimate_id?: string;
    original_hours?: number;
    change_order_hours?: number;
    original_rate?: number;
    change_order_rate?: number;
    change_orders_list?: Estimate[]; // Full change order objects when included
    // Legacy field names for compatibility
    estimate_date?: string; // Alias for scheduled_date
    estimate_hours?: number; // Alias for hours_bid
    description?: string; // Alias for notes
    client_address?: string; // Alias for address_street
    city?: string; // Alias for address_city
    state?: string; // Alias for address_state
    zip_code?: string; // Alias for address_zipcode
    // Cover photo
    cover_photo_resource_id?: string;
    referral_source?: string;
    referral_name?: string;
    // Date fields
    sent_date?: string;
    is_project?: number;
    sold_date?: string;
    started_date?: string;
    finished_date?: string;
    tentative_scheduling_date?: string;
    invoiced_date?: string;
    payment_received_date?: string;
    quickbooks_customer_id?: string;
    quickbooks_estimate_id?: string;
    quickbooks_invoice_id?: string;
    hours_worked?: number; // Calculated from time entries
    // Follow-up and column tracking
    column_entered_at?: string;
    follow_up_count?: number;
    last_follow_up_at?: string;
    next_follow_up_at?: string;
    needs_follow_up?: boolean;
    needs_follow_up_at?: string;
    /** Set when follow-up scheduler resurfaces estimate (NEEDS_FOLLOW_UP -> ESTIMATE_SENT) */
    resurfaced_at?: string | null;
    days_in_column?: number | null;
    is_terminal?: boolean;
};

// Status Actions Configuration Types
export type StatusActionType = 'SET_OWNER' | 'SEND_NOTIFICATION';

export interface SetOwnerAction {
    type: 'SET_OWNER';
    user_id: string;
}

export interface SendNotificationAction {
    type: 'SEND_NOTIFICATION';
    user_ids: string[];
}

export type StatusAction = SetOwnerAction | SendNotificationAction;

export interface StatusActionsConfig {
    actions: {
        [status: string]: StatusAction[];
    };
}

export interface StatusActionsConfiguration {
    id: string;
    user_id: string;
    contractor_id: string;
    configuration_type: 'status_actions';
    configuration: StatusActionsConfig;
    created_at: string;
    updated_at: string;
}

export type EstimateResource = {
    id: string;
    contractor_id: string;
    resource_location: string;
    resource_type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'OTHER';
    estimate_id: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    upload_status: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
    upload_progress: number;
    error_message?: string;
    s3_key?: string;
    s3_bucket?: string;
    completed_at?: string;
};

export type SubClient = {
    id: string;
    name: string;
    email: string;
    phone_number: string;
    role?: string;
    notes?: string;
};

export type ContractorClient = {
    id: string;
    contractor_id: string;
    name: string;
    email: string;
    phone_number: string;
    address_street?: string;
    address_city?: string;
    address_state?: string;
    address_zipcode?: string;
    address_country?: string;
    notes?: string;
    sub_clients?: SubClient[];
    created_at: string;
    updated_at: string;
};

export type User = {
    id: string;
    email: string;
    full_name?: string;
};
