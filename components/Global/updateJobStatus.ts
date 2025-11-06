'use client';

import { JobStatus } from './model';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';
import { logToCloudWatch } from '@/public/logger';

export default async function updateJobStatus(status: JobStatus, jobID: string) {
    const content: UpdateJobContent = {
        job_status: status,
    };

    const response = await fetch(
        '/api/jobs',
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content, jobID }),
        }
    );

    await logToCloudWatch(`Job status for jog with id: ${jobID} updated to: ${status}`);
    const { Attributes } = await response.json();
    return Attributes;
}
