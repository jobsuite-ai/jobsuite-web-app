'use client';

import { useEffect, useRef, useState } from 'react';

import { ActionIcon, Avatar, Button, Card, Divider, Group, Paper, Popover, Skeleton, Stack, Text, Textarea, rem } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconChevronDown, IconClock, IconMessage, IconMoodSmile, IconSend } from '@tabler/icons-react';

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

interface JobCommentsProps {
    estimateID: string;
    onLoadingChange?: (loading: boolean) => void;
}

export default function JobComments({ estimateID, onLoadingChange }: JobCommentsProps) {
    const [loading, setLoading] = useState(true);
    const [commentInputLoading, setCommentInputLoading] = useState(false);
    const [jobComments, setJobComments] = useState<SingleComment[]>();
    const [commentContents, setCommentContents] = useState<string>();
    const [emojiPickerOpened, setEmojiPickerOpened] = useState(false);
    const [showAllComments, setShowAllComments] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const showQuickReplies = !commentContents || commentContents.trim().length === 0;

    async function getJobComments() {
        try {
            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
                notifications.show({
                    title: 'Authentication Error',
                    position: 'top-center',
                    color: 'red',
                    message: 'Please log in to view comments.',
                });
                setJobComments([]);
                return;
            }

            const response = await fetch(
                `/api/estimate-comments/${estimateID}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                notifications.show({
                    title: 'Error',
                    position: 'top-center',
                    color: 'red',
                    message: errorData.message || 'Failed to fetch comments.',
                });
                setJobComments([]);
                return;
            }

            const { Items } = await response.json();
            // Map backend response to frontend format (created_at -> timestamp)
            const mappedComments = Items?.map((comment: any) => ({
                ...comment,
                timestamp: comment.created_at || comment.timestamp,
            })) || [];
            // Sort comments by timestamp descending (newest first)
            const sortedComments = mappedComments.sort((a: SingleComment, b: SingleComment) => {
                const dateA = new Date(a.timestamp).getTime();
                const dateB = new Date(b.timestamp).getTime();
                return dateB - dateA;
            });
            setJobComments(sortedComments);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching comments:', error);
            notifications.show({
                title: 'Error',
                position: 'top-center',
                color: 'red',
                message: 'An error occurred while fetching comments.',
            });
            setJobComments([]);
        }
    }

    useEffect(() => {
        setLoading(true);
        onLoadingChange?.(true);
        getJobComments().finally(() => {
            setLoading(false);
            onLoadingChange?.(false);
        });
    }, [estimateID, onLoadingChange]);

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
        const response = await fetch(
            `/api/estimate-comments/${estimateID}`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
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
            // Prepend new comment to the beginning (newest first)
            jobComments ? setJobComments([newComment, ...jobComments])
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

    if (loading) {
        return <LoadingState />;
    }

    // Use generic placeholder for skeleton comment initials
    // The actual user info will come from the backend when the comment is created
    const userInitials = 'U';

    // Determine which comments to display
    const displayedComments = showAllComments
        ? jobComments
        : jobComments?.slice(0, 3);
    const hasMoreComments = (jobComments?.length || 0) > 3;

    return (
        <Stack gap="md" className={classes.commentsContainer}>
            <Divider label="Add a comment" labelPosition="left" />

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
                                  disabled={commentInputLoading}
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
                                      disabled={commentInputLoading}
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

            <Stack gap="xs">
                {/* Show skeleton loading comment when posting */}
                {commentInputLoading && (
                  <Card
                    shadow="xs"
                    padding="md"
                    radius="md"
                    withBorder
                    style={{ marginBottom: rem(16) }}
                  >
                    <Stack gap="xs">
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Group gap="sm" align="center" wrap="nowrap">
                          <Avatar
                            size="md"
                            radius="xl"
                            color="blue"
                            variant="light"
                          >
                            {userInitials}
                          </Avatar>
                          <div>
                            <Skeleton height={16} width={120} radius="sm" mb={4} />
                            <Group gap={4} mt={2}>
                              <IconClock size={12} style={{ opacity: 0.6 }} />
                              <Skeleton height={12} width={100} radius="sm" />
                            </Group>
                          </div>
                        </Group>
                      </Group>
                      <div style={{ paddingLeft: rem(48) }}>
                        <Skeleton height={14} width="100%" radius="sm" mb={6} />
                        <Skeleton height={14} width="90%" radius="sm" mb={6} />
                        <Skeleton height={14} width="75%" radius="sm" />
                      </div>
                    </Stack>
                  </Card>
                )}

                {/* Show existing comments (newest first) */}
                {jobComments && jobComments.length > 0 ? (
                    <>
                        {displayedComments?.map((comment) => (
                            <JobComment key={comment.id} commentDetails={comment} />
                        ))}
                        {hasMoreComments && !showAllComments && (
                          <Button
                            variant="light"
                            leftSection={<IconChevronDown size={16} />}
                            onClick={() => setShowAllComments(true)}
                            fullWidth
                            mt="xs"
                          >
                            More
                          </Button>
                        )}
                    </>
                ) : !commentInputLoading ? (
                    <Paper p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
                        <IconMessage size={48} style={{ opacity: 0.3, margin: '0 auto' }} />
                        <Text c="dimmed" mt="md" size="sm">
                            No comments yet. Be the first to add a comment!
                        </Text>
                    </Paper>
                ) : null}
            </Stack>
        </Stack>
    );
}
