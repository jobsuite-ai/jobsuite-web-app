'use client';

import { useEffect, useRef, useState } from 'react';

import { useUser } from '@auth0/nextjs-auth0/client';
import { ActionIcon, Button, Card, Divider, Group, Paper, Popover, Stack, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMessage, IconMoodSmile, IconSend } from '@tabler/icons-react';

import { JobComment } from './JobComment';
import { SingleComment } from '../../Global/model';
import classes from '../styles/EstimateDetails.module.css';

import LoadingState from '@/components/Global/LoadingState';

const QUICK_REPLIES = [
    'Looks good! 👍',
    'Thanks for the update! 🙏',
    'Great work! 👏',
    'I\'ll review this shortly.',
];

const COMMON_EMOJIS = [
    '👍', '👎', '❤️', '😊', '😄', '😍', '🤔', '😅',
    '🙌', '👏', '🎉', '✅', '❌', '⚠️', '💡', '🔥',
    '💪', '🚀', '⭐', '✨', '💯', '🎯', '🙏', '😎',
];

export default function JobComments({ estimateID }: { estimateID: string }) {
    const [loading, setLoading] = useState(true);
    const [commentInputLoading, setCommentInputLoading] = useState(false);
    const [jobComments, setJobComments] = useState<SingleComment[]>();
    const [commentContents, setCommentContents] = useState<string>();
    const [emojiPickerOpened, setEmojiPickerOpened] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { user, isLoading } = useUser();

    const showQuickReplies = !commentContents || commentContents.trim().length === 0;

    async function getJobComments() {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            notifications.show({
                title: 'Authentication Error',
                position: 'top-center',
                color: 'red',
                message: 'Please log in to view comments.',
            });
            return;
        }

        const response = await fetch(
            `/api/job-comments/${estimateID}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const { Items } = await response.json();
        // Map backend response to frontend format (created_at -> timestamp)
        const mappedComments = Items?.map((comment: any) => ({
            ...comment,
            timestamp: comment.created_at || comment.timestamp,
        })) || [];
        setJobComments(mappedComments);
    }

    useEffect(() => {
        setLoading(true);
        getJobComments().finally(() => setLoading(false));
    }, [estimateID]);

    async function postJobComment() {
        if (!commentContents?.trim()) {
            notifications.show({
                title: 'Empty Comment',
                position: 'top-center',
                color: 'yellow',
                message: 'Please enter a comment before posting.',
            });
            return;
        }

        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            notifications.show({
                title: 'Authentication Error',
                position: 'top-center',
                color: 'red',
                message: 'Please log in to post comments.',
            });
            return;
        }

        setCommentInputLoading(true);
        const commenter = user?.name ?? 'unknown';
        const response = await fetch(
            '/api/job-comments',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    job_id: estimateID,
                    commenter,
                    comment_contents: commentContents,
                }),
            }
        );

        if (response.ok) {
            setCommentInputLoading(false);
            const createdComment = await response.json();
            notifications.show({
                title: 'Success!',
                position: 'top-center',
                color: 'green',
                message: 'The comment was added successfully.',
            });
            setCommentContents('');
            // Map backend response to frontend format
            const newComment: SingleComment = {
                id: createdComment.id,
                job_id: estimateID,
                commenter: createdComment.commenter,
                comment_contents: createdComment.comment_contents,
                timestamp: createdComment.created_at || createdComment.timestamp ||
                    new Date().toISOString(),
            };
            jobComments ? setJobComments([...jobComments, newComment])
                : setJobComments([newComment]);
        } else {
            setCommentInputLoading(false);
            notifications.show({
                title: 'Creation Failed',
                position: 'top-center',
                color: 'red',
                message: 'The comment failed to create.',
            });
        }
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            postJobComment();
        }
    };

    const handleQuickReplyClick = (reply: string) => {
        setCommentContents(reply);
    };

    const insertEmojiAtCursor = (emoji: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = commentContents || '';
            const newText = text.substring(0, start) + emoji + text.substring(end);
            setCommentContents(newText);
            // Reset cursor position after emoji
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + emoji.length, start + emoji.length);
            }, 0);
        } else {
            setCommentContents((prev) => (prev || '') + emoji);
        }
        setEmojiPickerOpened(false);
    };

    if (loading || isLoading || !user) {
        return <LoadingState />;
    }

    return (
        <Stack gap="md" className={classes.commentsContainer}>
            {jobComments && jobComments.length > 0 ? (
                <Stack gap="xs">
                    {jobComments.map((comment) => (
                        <JobComment key={comment.id} commentDetails={comment} />
                    ))}
                </Stack>
            ) : (
                <Paper p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
                    <IconMessage size={48} style={{ opacity: 0.3, margin: '0 auto' }} />
                    <Text c="dimmed" mt="md" size="sm">
                        No comments yet. Be the first to add a comment!
                    </Text>
                </Paper>
            )}

            <Divider label="Add a comment" labelPosition="left" />

            {commentInputLoading ? (
                <LoadingState />
            ) : (
                <Card shadow="xs" padding="md" radius="md" withBorder>
                    <Stack gap="md">
                        <Textarea
                          ref={textareaRef}
                          placeholder="Write your comment here... (Press Cmd/Ctrl + Enter to submit)"
                          autosize
                          minRows={3}
                          maxRows={8}
                          onChange={(event) => setCommentContents(event.currentTarget.value)}
                          onKeyDown={handleKeyDown}
                          value={commentContents}
                          disabled={commentInputLoading}
                        />
                        <Group justify="space-between" align="center" wrap="wrap">
                            <Popover
                              opened={emojiPickerOpened}
                              onChange={setEmojiPickerOpened}
                              position="top-start"
                              withArrow
                            >
                                <Popover.Target>
                                    <ActionIcon
                                      variant="light"
                                      color="gray"
                                      size="lg"
                                      onClick={() => setEmojiPickerOpened((o) => !o)}
                                    >
                                        <IconMoodSmile size={20} />
                                    </ActionIcon>
                                </Popover.Target>
                                <Popover.Dropdown>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, width: 240 }}>
                                        {COMMON_EMOJIS.map((emoji) => (
                                            <ActionIcon
                                              key={emoji}
                                              variant="subtle"
                                              size="lg"
                                              onClick={() => insertEmojiAtCursor(emoji)}
                                              style={{ fontSize: '1.5rem', cursor: 'pointer' }}
                                            >
                                                {emoji}
                                            </ActionIcon>
                                        ))}
                                    </div>
                                </Popover.Dropdown>
                            </Popover>
                            {showQuickReplies && (
                                <Group gap="xs">
                                    {QUICK_REPLIES.map((reply) => (
                                        <Button
                                          key={reply}
                                          size="xs"
                                          variant="light"
                                          onClick={() => handleQuickReplyClick(reply)}
                                          style={{ fontSize: '0.75rem' }}
                                        >
                                            {reply}
                                        </Button>
                                    ))}
                                </Group>
                            )}
                            <Button
                              onClick={postJobComment}
                              leftSection={<IconSend size={16} />}
                              disabled={!commentContents?.trim() || commentInputLoading}
                              loading={commentInputLoading}
                            >
                                Post Comment
                            </Button>
                        </Group>
                    </Stack>
                </Card>
            )}
        </Stack>
    );
}
