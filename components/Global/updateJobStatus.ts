'use client';

import { useUser } from '@auth0/nextjs-auth0/client';

import { JobStatus } from './model';

import { UpdateJobContent } from '@/app/api/jobs/jobTypes';
import { logToCloudWatch } from '@/public/logger';

export default async function updateJobStatus(status: JobStatus, jobID: string) {
    const { user } = useUser();
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

    const { Attributes } = await response.json();

    logToCloudWatch(`Job status for jog with id: ${jobID} updated to: ${status} by: ${user?.email}`);
    return Attributes;
}
