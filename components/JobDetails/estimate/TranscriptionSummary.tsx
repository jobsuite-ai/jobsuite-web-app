'use client';

import { useState } from 'react';

import { Button, Group, Paper, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCopy, IconEdit, IconReload } from '@tabler/icons-react';

import classes from './Estimate.module.css';
import MarkdownRenderer from '../../Global/MarkdownRenderer';
import { SingleJob } from '../../Global/model';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';
import LoadingState from '@/components/Global/LoadingState';

export default function TranscriptionSummary({ job, refresh }: {
    job: SingleJob,
    refresh: Function
}) {
    const [editMarkdown, setEditMarkdown] = useState(false);
    const [markdown, setMarkdown] = useState(job.transcription_summary?.S ?? '');
    const [loading, setLoading] = useState(false);

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

    const handleEdit = async () => {
        setMarkdown(job.transcription_summary.S);
        setEditMarkdown(true);
    };

    const handleMarkdownChange = (event: any) => {
        setMarkdown(event.target.value);
    };

    const handleEditSave = async () => {
        const content: UpdateJobContent = {
            transcription_summary: markdown,
        };

        const response = await fetch(
            '/api/jobs',
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content, jobID: job.id.S }),
            }
        );

        await response.json();
        job.transcription_summary.S = markdown;
        setEditMarkdown(false);
    };

    const reload = async () => {
        setLoading(true);
        refresh().finally(() => setLoading(false));
    };

    return (
        <>
            {job.video?.M?.name &&
                <Paper shadow="sm" radius="md" withBorder p="lg" className={classes.estimateWrapper}>
                    {job.transcription_summary?.S ?
                        <>
                            {editMarkdown ?
                                <>
                                    <textarea
                                      value={markdown}
                                      onChange={handleMarkdownChange}
                                      style={{
                                            width: '100%',
                                            height: '300px',
                                            padding: '10px',
                                            fontSize: '16px',
                                            fontFamily: 'monospace',
                                            border: '1px solid #ccc',
                                            borderRadius: '5px',
                                        }}
                                      placeholder={markdown}
                                    />
                                    <Group justify="center" mt="lg">
                                        <Button onClick={handleEditSave}>Save</Button>
                                    </Group>
                                </>
                            :
                                <>
                                    <div style={{ position: 'relative' }}>
                                        <IconCopy
                                          onClick={() => copyToClipboard()}
                                          style={{ cursor: 'pointer', position: 'absolute', top: '20px', right: '0px' }}
                                        />
                                        <IconEdit
                                          onClick={() => handleEdit()}
                                          style={{ cursor: 'pointer', position: 'absolute', top: '20px', right: '35px' }}
                                        />
                                    </div>
                                    <MarkdownRenderer markdown={job.transcription_summary.S} />
                                </>
                            }
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
                                    <Text>The transcription summary is still processing.</Text>
                                </>
                            }
                        </>
                    }
                </Paper>
            }
        </>
    );
}
