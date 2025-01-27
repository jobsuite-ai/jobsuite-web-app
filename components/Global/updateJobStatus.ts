"use client";

import { UpdateJobContent } from '@/app/api/jobs/jobTypes';
import { JobStatus } from './model'

export default async function updateJobStatus(status: JobStatus, jobID: string) {
    const content: UpdateJobContent = {
        job_status: status
    }

    const response = await fetch(
        '/api/jobs',
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: content, jobID: jobID }),
        }
    )

    const { Attributes } = await response.json();
    return Attributes;
}
