export type Job = {
    client_address: string; 
    client_email: string;
    client_name: string;
    client_phone_number: string;
    estimate_date: string;
    id: string;
    user_id: string;
    video: any;
    status: JobStatus;
}

export type SingleJob = {
    client_address: TypedDynamoStringReturn; 
    client_email: TypedDynamoStringReturn;
    client_name: TypedDynamoStringReturn;
    client_phone_number: TypedDynamoStringReturn;
    estimate_date: TypedDynamoStringReturn;
    id: TypedDynamoStringReturn;
    user_id: TypedDynamoStringReturn;
    video: TypedDynamoMapReturn<JobVideo>;
    status: JobStatus;
}

type TypedDynamoStringReturn = {
    S: string;
}
type TypedDynamoNumberReturn = {
    N: string;
}
type TypedDynamoMapReturn<T> = {
    M: T;
}

type JobVideo = {
    name: TypedDynamoStringReturn,
    size: TypedDynamoNumberReturn,
    lastModified: TypedDynamoNumberReturn
}

export enum JobStatus {
    COMPLETED,
    IN_PROGRESS,
    ESTIMATE_ACCEPTED,
    ESTIMATE_DECLINED,
    ESTIMATE_SENT,
    ESTIMATE_OPENED,
    PENDING_ESTIMATE
}