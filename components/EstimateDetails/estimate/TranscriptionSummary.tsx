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
import RichTextBodyEditor from '@/components/Global/RichTextBodyEditor';

export interface TranscriptionSummaryRef {
    copyToClipboard: () => void;
    handleEdit: () => void;
    handleSave: () => void;
}

type TranscriptionSummaryProps = {
    estimate: Estimate;
    estimateID: string;
    refresh: Function;
    autoEdit?: boolean;
    onSaveSuccess?: () => void;
    showSaveButton?: boolean;
    useRichTextEditor?: boolean;
};

const TranscriptionSummary = forwardRef<TranscriptionSummaryRef, TranscriptionSummaryProps>(({
    estimate,
    estimateID,
    refresh,
    autoEdit = false,
    onSaveSuccess,
    showSaveButton = true,
    useRichTextEditor = false,
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

    useEffect(() => {
        if (autoEdit) {
            setMarkdown(estimate.transcription_summary ?? '');
            setEditMarkdown(true);
        }
    }, [autoEdit, estimate.transcription_summary]);

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
        handleSave: handleEditSave,
    }));

    const handleMarkdownChange = (event: any) => {
        setMarkdown(event.target.value);
    };

    const handleEditSave = async () => {
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            notifications.show({
                title: 'Error',
                position: 'top-center',
                color: 'red',
                message: 'Authentication required. Please log in again.',
            });
            return;
        }

        const content: UpdateJobContent = {
            transcription_summary: markdown,
        };

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}`,
                {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(content),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // eslint-disable-next-line no-console
                console.error('Error updating description:', errorData);
                notifications.show({
                    title: 'Error',
                    position: 'top-center',
                    color: 'red',
                    message: 'Failed to update description',
                });
                return;
            }

            await response.json();
            setEditMarkdown(false);
            refresh();
            if (onSaveSuccess) {
                onSaveSuccess();
            }
            notifications.show({
                title: 'Success!',
                position: 'top-center',
                color: 'green',
                message: 'Description updated successfully',
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error updating description:', error);
            notifications.show({
                title: 'Error',
                position: 'top-center',
                color: 'red',
                message: 'Failed to update description',
            });
        }
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
    const isHtmlDescription = !!transcriptionSummary
        && /<\/?[a-z][\s\S]*>/i.test(transcriptionSummary);

    const renderEditor = () => (
        useRichTextEditor ? (
            <RichTextBodyEditor value={markdown} onChange={setMarkdown} />
        ) : (
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
        )
    );

    return (
        <div className={classes.transcriptionContainer}>
            {hasTranscription ?
                <>
                    {editMarkdown ?
                        <>
                            {renderEditor()}
                            {showSaveButton && (
                                <Group justify="center" mt="lg">
                                    <Button onClick={handleEditSave}>Save</Button>
                                </Group>
                            )}
                        </>
                    :
                        (isHtmlDescription ? (
                            <div
                              className={classes.transcriptionContainer}
                              dangerouslySetInnerHTML={{
                                __html: estimate.transcription_summary || '',
                              }}
                            />
                        ) : (
                            <MarkdownRenderer markdown={estimate.transcription_summary || ''} />
                        ))
                    }
                </>
                :
                <>
                    {editMarkdown ? (
                        <>
                            {renderEditor()}
                            {showSaveButton && (
                                <Group justify="center" mt="lg">
                                    <Button onClick={handleEditSave}>Save</Button>
                                </Group>
                            )}
                        </>
                    ) : (
                        <>
                            {loading ?
                                <LoadingState size="sm" />
                                :
                                <>
                                    <Group justify="space-between" align="center">
                                        <Text>The transcription summary is still processing.</Text>
                                        <IconReload
                                          onClick={() => reload()}
                                          style={{ cursor: 'pointer' }}
                                        />
                                    </Group>
                                    <Group justify="center" mt="lg">
                                        <Button
                                          variant="outline"
                                          onClick={() => setEditMarkdown(true)}
                                        >
                                            Add Description
                                        </Button>
                                    </Group>
                                </>
                            }
                        </>
                    )}
                </>
            }
        </div>
    );
});

TranscriptionSummary.displayName = 'TranscriptionSummary';

export default TranscriptionSummary;
