export type Job = {
    client_address: string;
    city: string;
    state: string;
    zip_code: string;
    client_email: string;
    client_name: string;
    client_phone_number: string;
    estimate_date: string;
    client_id: string;
    id: string;
    user_id: string;
    video: any;
    job_status: JobStatus;
    job_type: string;
    job_title: string;
    referral_source: string;
    updated_at: string;
    estimate_hours: string;
    actual_hours: string;
};

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
    client_name: TypedDynamoStringReturn;
    phone_number: TypedDynamoStringReturn;
    user_id: TypedDynamoStringReturn;
    id: TypedDynamoStringReturn;
    jobs: TypedDynamoListReturn<TypedDynamoStringReturn[]>;
};

export type SingleJob = {
    job_title: TypedDynamoStringReturn;
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
    job_status: {
        S: JobStatus;
    };
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
    job_crew_lead?: TypedDynamoStringReturn;
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

export enum JobStatus {
    ACCOUNTING_NEEDED = 'ACCOUNTING_NEEDED',
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
    RLPP_OPENED = 'RLPP_OPENED',
    RLPP_DECLINED = 'RLPP_DECLINED',
    RLPP_SIGNED = 'RLPP_SIGNED',
    JOB_COMPLETE = 'JOB_COMPLETE',
    ARCHIVED = 'ARCHIVED',
}

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
    ARCHIVED = 'ARCHIVED',
}

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
    client_name?: string; // Added by backend when listing estimates
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
    created_at: string;
    updated_at: string;
};

export const DropdownJobStatus = {
    NEW_LEAD: JobStatus.NEW_LEAD,
    ESTIMATE_NOT_SCHEDULED: JobStatus.ESTIMATE_NOT_SCHEDULED,
    ESTIMATE_SCHEDULED: JobStatus.ESTIMATE_SCHEDULED,
    ESTIMATE_IN_PROGRESS: JobStatus.ESTIMATE_IN_PROGRESS,
    NEEDS_FOLLOW_UP: JobStatus.NEEDS_FOLLOW_UP,
    ESTIMATE_SENT: JobStatus.ESTIMATE_SENT,
    JOB_COMPLETE: JobStatus.JOB_COMPLETE,
    ESTIMATE_DECLINED: JobStatus.ESTIMATE_DECLINED,
    RLPP_SIGNED: JobStatus.RLPP_SIGNED,
} as const;
