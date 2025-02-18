import { JobStatus } from '@/components/Global/model';

export type UpdateJobContent = {
    line_item?: JobLineItem,
    delete_line_item?: number,
    delete_image?: boolean,
    delete_video?: boolean,
    video?: JobVideo,
    images?: JobImage[],
    job_status?: JobStatus,
    transcription_summary?: string,
    estimate_date?: any,
    estimate_hours?: string,
    update_client_details?: UpdateClientDetailsInput,
    update_client_name?: string,
    update_hours_and_rate?: UpdateHoursAndRateInput,
};

export type UpdateHoursAndRateInput = {
    hours: string,
    rate: string,
    date: string,
    discount_reason: string,
};

export type UpdateClientDetailsInput = {
    client_address: string,
    city: string,
    zip_code: string,
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
    hours: number;
};
