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
    client_address: TypedDynamoReturn; 
    client_email: TypedDynamoReturn;
    client_name: TypedDynamoReturn;
    client_phone_number: TypedDynamoReturn;
    estimate_date: TypedDynamoReturn;
    id: TypedDynamoReturn;
    user_id: TypedDynamoReturn;
    video: any;
    status: JobStatus;
}

type TypedDynamoReturn = {
    S: string;
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