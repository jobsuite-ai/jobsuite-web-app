'use client';

import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';

import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import '@mantine/tiptap/styles.css';
import { IconReload } from '@tabler/icons-react';

import DescriptionContentView from '../../Global/DescriptionContentView';
import { Estimate } from '../../Global/model';
import classes from '../styles/EstimateDetails.module.css';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';
import LoadingState from '@/components/Global/LoadingState';
import RichTextBodyEditor from '@/components/Global/RichTextBodyEditor';
import {
    htmlToMarkdown,
    isHtml,
    markdownToHtml,
} from '@/utils/descriptionContent';

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
};

const TranscriptionSummary = forwardRef<TranscriptionSummaryRef, TranscriptionSummaryProps>(({
    estimate,
    estimateID,
    refresh,
    autoEdit = false,
    onSaveSuccess,
    showSaveButton = true,
}, ref) => {
    const [editMarkdown, setEditMarkdown] = useState(false);
    /** When editing: HTML for the rich text editor (from markdown when opening) */
    const [editorHtml, setEditorHtml] = useState('');
    const [loading, setLoading] = useState(false);
    /** Avoid re-running markdown→HTML when parent refreshes while user is editing */
    const prevEditMarkdownRef = useRef(false);
    /** True once we've loaded non-empty summary into the editor for this edit session */
    const hadSummaryWhileEditingRef = useRef(false);

    // Hydrate editor when entering edit or when summary first loads after opening empty — not on
    // every parent/Redux refresh while editing.
    useEffect(() => {
        const wasEditing = prevEditMarkdownRef.current;
        prevEditMarkdownRef.current = editMarkdown;
        if (!editMarkdown) {
            hadSummaryWhileEditingRef.current = false;
            return undefined;
        }
        const source = (estimate.transcription_summary ?? '').trim();
        const justEnteredEdit = !wasEditing && editMarkdown;
        const summaryArrivedWhileEditing =
            wasEditing &&
            editMarkdown &&
            !hadSummaryWhileEditingRef.current &&
            source.length > 0;

        if (!justEnteredEdit && !summaryArrivedWhileEditing) {
            return undefined;
        }

        if (!source) {
            setEditorHtml('');
            return undefined;
        }
        if (justEnteredEdit) {
            hadSummaryWhileEditingRef.current = true;
        } else if (summaryArrivedWhileEditing) {
            hadSummaryWhileEditingRef.current = true;
        }
        if (isHtml(source)) {
            setEditorHtml(source);
            return undefined;
        }
        let cancelled = false;
        markdownToHtml(source).then((html) => {
            if (!cancelled) {
                setEditorHtml(html);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [editMarkdown, estimate.transcription_summary]);

    useEffect(() => {
        if (autoEdit) {
            setEditMarkdown(true);
        }
    }, [autoEdit]);

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
        setEditMarkdown(true);
    };

    useImperativeHandle(ref, () => ({
        copyToClipboard,
        handleEdit,
        handleSave: handleEditSave,
    }));

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
            transcription_summary: htmlToMarkdown(editorHtml),
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

    const renderEditor = () => (
        <RichTextBodyEditor value={editorHtml} onChange={setEditorHtml} />
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
                        <DescriptionContentView
                          content={estimate.transcription_summary || ''}
                          className={classes.transcriptionContainer}
                            />
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
