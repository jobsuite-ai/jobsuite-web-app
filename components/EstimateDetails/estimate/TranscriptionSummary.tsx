'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconReload } from '@tabler/icons-react';

import MarkdownRenderer from '../../Global/MarkdownRenderer';
import { Estimate } from '../../Global/model';
import classes from '../styles/EstimateDetails.module.css';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';
import LoadingState from '@/components/Global/LoadingState';

export interface TranscriptionSummaryRef {
    copyToClipboard: () => void;
    handleEdit: () => void;
}

const TranscriptionSummary = forwardRef<TranscriptionSummaryRef, {
    estimate: Estimate;
    estimateID: string;
    refresh: Function;
}>(({
    estimate,
    estimateID,
    refresh,
}, ref) => {
    const [editMarkdown, setEditMarkdown] = useState(false);
    const [markdown, setMarkdown] = useState(estimate.transcription_summary ?? '');
    const [loading, setLoading] = useState(false);

    // Update markdown state when estimate changes
    useEffect(() => {
        if (!editMarkdown) {
            setMarkdown(estimate.transcription_summary ?? '');
        }
    }, [estimate.transcription_summary, editMarkdown]);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(estimate.transcription_summary || '');
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
        setMarkdown(estimate.transcription_summary ?? '');
        setEditMarkdown(true);
    };

    useImperativeHandle(ref, () => ({
        copyToClipboard,
        handleEdit,
    }));

    const handleMarkdownChange = (event: any) => {
        setMarkdown(event.target.value);
    };

    const handleEditSave = async () => {
        const content: UpdateJobContent = {
            transcription_summary: markdown,
        };

        const response = await fetch(
            `/api/estimates/${estimateID}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(content),
            }
        );

        await response.json();
        setEditMarkdown(false);
        refresh();
    };

    const reload = async () => {
        setLoading(true);
        refresh().finally(() => setLoading(false));
    };

    // Note: Transcription summary can exist without a video, so we don't require video

    // Check if transcription_summary exists and is not empty
    const transcriptionSummary = estimate.transcription_summary;
    const hasTranscription = transcriptionSummary
        && typeof transcriptionSummary === 'string'
        && transcriptionSummary.trim().length > 0;

    return (
        <div className={classes.transcriptionContainer}>
            {hasTranscription ?
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
                        <MarkdownRenderer markdown={estimate.transcription_summary || ''} />
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
        </div>
    );
});

TranscriptionSummary.displayName = 'TranscriptionSummary';

export default TranscriptionSummary;
