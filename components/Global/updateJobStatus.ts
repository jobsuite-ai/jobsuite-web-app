'use client';

import { JobStatus } from './model';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';
import { getApiHeaders } from '@/app/utils/apiClient';
import { logToCloudWatch } from '@/public/logger';

export default async function updateJobStatus(status: JobStatus, jobID: string) {
    const content: UpdateJobContent = {
        job_status: status,
    };

    const response = await fetch(
        `/api/projects/${jobID}`,
        {
            method: 'PUT',
            headers: getApiHeaders(),
            body: JSON.stringify(content),
        }
    );

    await logToCloudWatch(`Job status for jog with id: ${jobID} updated to: ${status}`);
    const result = await response.json();
    return result;
}
