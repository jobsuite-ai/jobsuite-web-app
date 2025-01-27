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
    header: string;
    description: string;
    price: number;
};
