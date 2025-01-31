import { JobStatus } from '@/components/Global/model';

export type UpdateJobContent = {
    line_item?: JobLineItem,
    delete_line_item?: number,
    delete_image?: boolean,
    video?: JobVideo,
    images?: JobImage[],
    job_status?: JobStatus,
    transcription_summary?: string,
    estimate_date?: any,
    estimate_hours?: string,
    update_client_details?: UpdateClientDetailsInput,
    update_hours_and_rate?: UpdateHoursAndRateInput,
};

export type UpdateHoursAndRateInput = {
    hours: string,
    rate: string,
};

export type UpdateClientDetailsInput = {
    client_name: string,
    client_address: string,
    city: string,
    state: string,
    zip_code: string,
    client_email: string,
    client_phone_number: string,
};

export type JobVideo = {
    name: string;
    size: number;
    lastModified: number;
};

export type JobImage = {
    name: string;
    size: number;
    lastModified: number;
};

export type JobLineItem = {
    id: string;
    header: string;
    description: string;
    price: number;
};
