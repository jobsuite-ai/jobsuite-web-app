'use client';

import { useState } from 'react';

import { Flex, Paper, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCopy, IconReload } from '@tabler/icons-react';

import classes from './Estimate.module.css';
import MarkdownRenderer from '../../Global/MarkdownRenderer';
import { SingleJob } from '../../Global/model';

import LoadingState from '@/components/Global/LoadingState';

export default function SpanishTranscription({ job, refresh }: {
    job: SingleJob,
    refresh: Function
}) {
    const [loading, setLoading] = useState(false);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(job.spanish_transcription.S);
            setTimeout(() => 1000);

            notifications.show({
                title: 'Success!',
                position: 'top-center',
                color: 'green',
                message: 'Translation copied to clipboard',
            });
        } catch (err) {
            notifications.show({
                title: 'Creation Failed',
                position: 'top-center',
                color: 'red',
                message: 'Translation failed to copy to clipboard',
            });
        }
    };

    const reload = async () => {
        setLoading(true);
        refresh().finally(() => setLoading(false));
    };

    return (
        <>
            {job.video?.M?.name &&
                <Paper shadow="sm" radius="md" withBorder p="lg" className={classes.estimateWrapper}>
                    {job.spanish_transcription?.S ?
                        <>
                            <Flex justify="space-between">
                                <h2 style={{ marginTop: '0px' }}>Spanish Transcription</h2>
                                <IconCopy onClick={() => copyToClipboard()} style={{ cursor: 'pointer' }} />
                            </Flex>
                            <MarkdownRenderer markdown={job.spanish_transcription.S} />
                        </>
                        :
                        <>
                            {loading ?
                                <LoadingState size="sm" />
                                :
                                <>
                                    <div style={{ position: 'relative' }}>
                                        <IconReload
                                          onClick={() => reload()}
                                          style={{ cursor: 'pointer', position: 'absolute', right: '0px' }}
                                        />
                                    </div>
                                    <Text>The spanish transcription is still processing.</Text>
                                </>
                            }
                        </>
                    }
                </Paper>
            }
        </>
    );
}
