"use client";

import { Flex, Paper, Text } from '@mantine/core';
import MarkdownRenderer from '../../Global/MarkdownRenderer';
import { SingleJob } from '../../Global/model';
import { notifications } from '@mantine/notifications';
import { IconCopy } from '@tabler/icons-react';
import classes from './Estimate.module.css'

export default function SpanishTranscription({ job }: { job: SingleJob }) {
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


    return (
        <>
            {job.video?.M?.name &&
                <Paper shadow='sm' radius='md' withBorder p='lg' className={classes.estimateWrapper}>
                    {job.spanish_transcription?.S ?
                        <>
                            <Flex justify='space-between'>
                                <h2 style={{ marginTop: '0px'}}>Spanish Transcription</h2>
                                <IconCopy onClick={() => copyToClipboard()} style={{ cursor: 'pointer' }} />
                            </Flex>
                            <MarkdownRenderer markdown={job.spanish_transcription.S} />
                        </>
                        : <Text>The spanish transcription is still processing... try reloading</Text>
                    }
                </Paper>
            }
        </>
    );
}
