'use client';

import { useParams } from 'next/navigation';
import JobDetails from '@/components/JobDetails/JobDetails';

export default function Job() {
    const params = useParams();
    return (<JobDetails jobID={params.job_id as string} />);
}
