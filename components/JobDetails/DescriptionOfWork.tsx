"use client";

import MarkdownRenderer from '@/components/Global/MarkdownRenderer';
import { SingleJob } from '@/components/Global/model';
import { Paper } from '@mantine/core';

export default function DescriptionOfWork({ job }: { job: SingleJob }) {
    return (
        <>
            {job.description?.S &&
                <Paper shadow='sm' radius='md' withBorder p='lg' style={{ width: '930px' }}>
                    <h3 style={{ marginTop: '0px'}}>Client Description of Work</h3>
                    <MarkdownRenderer markdown={job.description.S} />
                </Paper>
            }
        </>
    );
}
