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
}

export type Client = {
    address: string; 
    city: string;
    state: string;
    zip_code: string;
    email: string;
    name: string;
    phone_number: string;
    user_id: string;
    id: string;
    jobs: string[];
}

export type DynamoClient = {
    address: TypedDynamoStringReturn; 
    city: TypedDynamoStringReturn;
    state: TypedDynamoStringReturn;
    zip_code: TypedDynamoStringReturn;
    email: TypedDynamoStringReturn;
    name: TypedDynamoStringReturn;
    phone_number: TypedDynamoStringReturn;
    user_id: TypedDynamoStringReturn;
    id: TypedDynamoStringReturn;
    jobs: TypedDynamoListReturn<TypedDynamoStringReturn[]>;
}

export type SingleJob = {
    client_address: TypedDynamoStringReturn; 
    city: TypedDynamoStringReturn; 
    state: TypedDynamoStringReturn; 
    zip_code: TypedDynamoStringReturn; 
    client_email: TypedDynamoStringReturn;
    description: TypedDynamoStringReturn;
    transcription_summary: TypedDynamoStringReturn;
    line_items: TypedDynamoListReturn<TypedDynamoMapReturn<DynamoLineItem>[]>;
    spanish_transcription: TypedDynamoStringReturn;
    client_name: TypedDynamoStringReturn;
    client_phone_number: TypedDynamoStringReturn;
    estimate_date: TypedDynamoStringReturn;
    id: TypedDynamoStringReturn;
    user_id: TypedDynamoStringReturn;
    video: TypedDynamoMapReturn<JobVideo>;
    images: TypedDynamoListReturn<TypedDynamoMapReturn<JobVideo>[]>;
    job_status: {
        S: JobStatus;
    };
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
    header: TypedDynamoStringReturn,
    description: TypedDynamoStringReturn,
    price: TypedDynamoNumberReturn
}

export enum JobStatus {
    COMPLETED="COMPLETED",
    IN_PROGRESS="IN_PROGRESS",
    ESTIMATE_ACCEPTED="ESTIMATE_ACCEPTED",
    ESTIMATE_DECLINED="ESTIMATE_DECLINED",
    ESTIMATE_SENT="ESTIMATE_SENT",
    ESTIMATE_OPENED="ESTIMATE_OPENED",
    PENDING_ESTIMATE="PENDING_ESTIMATE"
}