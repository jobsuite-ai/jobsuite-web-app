"use client";

import { Paper, Text } from '@mantine/core';
import MarkdownRenderer from '../../Global/MarkdownRenderer';
import { SingleJob } from '../../Global/model';
import { notifications } from '@mantine/notifications';
import { IconCopy } from '@tabler/icons-react';
import classes from './Estimate.module.css'

export default function TranscriptionSummary({ job }: { job: SingleJob }) {
    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(job.transcription_summary.S);
            setTimeout(() => 1000);

            notifications.show({
                title: 'Success!',
                position: 'top-center',
                color: 'green',
                message: 'Summary copied to clipboard',
            });
        } catch (err) {
            notifications.show({
                title: 'Creation Failed',
                position: 'top-center',
                color: 'red',
                message: 'Summary failed to copy to clipboard',
            });
        }
    };

    return (
        <>
            {job.video?.M?.name &&
                <Paper shadow='sm' radius='md' withBorder pr='lg' pb='lg' pl='lg' className={classes.estimateWrapper}>
                    {job.transcription_summary?.S ? 
                        <>
                            <div style={{ position: 'relative' }}>
                                <IconCopy
                                    onClick={() => copyToClipboard()}
                                    style={{ cursor: 'pointer', position: 'absolute', top: '20px', right: '0px' }}
                                />
                            </div>
                            <MarkdownRenderer markdown={job.transcription_summary.S} />
                        </>
                        : <Text>The transcription summary is still processing... try reloading</Text>
                    }
                </Paper>
            }
        </>
    );
}
