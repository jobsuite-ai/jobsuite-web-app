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
}

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
}

export type DynamoClient = {
    email: TypedDynamoStringReturn;
    client_name: TypedDynamoStringReturn;
    phone_number: TypedDynamoStringReturn;
    user_id: TypedDynamoStringReturn;
    id: TypedDynamoStringReturn;
    jobs: TypedDynamoListReturn<TypedDynamoStringReturn[]>;
}

export type SingleJob = {
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
    hourly_rate: TypedDynamoNumberReturn;
    id: TypedDynamoStringReturn;
    images: TypedDynamoListReturn<TypedDynamoMapReturn<JobVideo>[]>;
    job_status: {
        S: JobStatus;
    };
    job_type: TypedDynamoStringReturn;
    line_items: TypedDynamoListReturn<TypedDynamoMapReturn<DynamoLineItem>[]>;
    season: TypedDynamoStringReturn;
    spanish_transcription: TypedDynamoStringReturn;
    state: TypedDynamoStringReturn; 
    transcription_summary: TypedDynamoStringReturn;
    user_id: TypedDynamoStringReturn;
    video: TypedDynamoMapReturn<JobVideo>;
    zip_code: TypedDynamoStringReturn; 
}

export type SingleLineItem = {
    header: string; 
    description: string; 
    price: string;
}

export type SingleComment = {
    id: string; 
    job_id: string; 
    comment_contents: string; 
    commenter: string; 
    timestamp: string;
}

type TypedDynamoStringReturn = {
    S: string;
}
type TypedDynamoNumberReturn = {
    N: string;
}
export type TypedDynamoMapReturn<T> = {
    M: T;
}
export type TypedDynamoListReturn<T> = {
    L: T;
}

export type JobVideo = {
    name: TypedDynamoStringReturn,
    size: TypedDynamoNumberReturn,
    lastModified: TypedDynamoNumberReturn
}

export type DynamoLineItem = {
    id: TypedDynamoStringReturn,
    header: TypedDynamoStringReturn,
    description: TypedDynamoStringReturn,
    price: TypedDynamoNumberReturn
}

export enum JobStatus {
    ESTIMATE_NOT_SCHEDULED="ESTIMATE_NOT_SCHEDULED",
    PENDING_ESTIMATE="PENDING_ESTIMATE",
    ESTIMATE_SENT="ESTIMATE_SENT",
    ESTIMATE_OPENED="ESTIMATE_OPENED",
    ESTIMATE_DECLINED="ESTIMATE_DECLINED",
    ESTIMATE_ACCEPTED="ESTIMATE_ACCEPTED",
    RLPP_OPENED="RLPP_OPENED",
    RLPP_DECLINED="RLPP_DECLINED",
    RLPP_SIGNED="RLPP_SIGNED",
}