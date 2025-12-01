'use client';

import { useEffect, useRef, useState } from 'react';

import {
    ActionIcon,
    Avatar,
    Button,
    Card,
    Divider,
    Group,
    Paper,
    Popover,
    Skeleton,
    Stack,
    Text,
    Textarea,
    rem,
} from '@mantine/core';
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

interface User {
    id: string;
    email: string;
    full_name: string;
}

export default function JobComments({ estimateID, onLoadingChange }: JobCommentsProps) {
    const [loading, setLoading] = useState(true);
    const [commentInputLoading, setCommentInputLoading] = useState(false);
    const [jobComments, setJobComments] = useState<SingleComment[]>();
    const [commentContents, setCommentContents] = useState<string>();
    const [emojiPickerOpened, setEmojiPickerOpened] = useState(false);
    const [showAllComments, setShowAllComments] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [mentionQuery, setMentionQuery] = useState<string>('');
    const [mentionPosition, setMentionPosition] = useState<{
        start: number;
        end: number;
    } | null>(null);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
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

    async function getUsers() {
        try {
            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
                return;
            }

            const response = await fetch('/api/users', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const usersData = await response.json();
                setUsers(usersData);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching users:', error);
        }
    }

    useEffect(() => {
        setLoading(true);
        onLoadingChange?.(true);
        getJobComments().finally(() => {
            setLoading(false);
            onLoadingChange?.(false);
        });
        getUsers();
    }, [estimateID, onLoadingChange]);

    // Replace @username with @user_id in comment contents
    function replaceMentionsWithUserIds(text: string): string {
        if (!text || !users.length) return text;

        let result = text;
        // Find all @mentions that match user names or emails
        const mentionPattern = /@([a-zA-Z0-9._-]+)/g;
        const matches = Array.from(text.matchAll(mentionPattern));

        // Process matches in reverse order to maintain positions
        for (let i = matches.length - 1; i >= 0; i -= 1) {
            const match = matches[i];
            const mentionText = match[1].toLowerCase();

            // Find matching user by name or email
            const user = users.find(
                (u) =>
                    u.full_name?.toLowerCase() === mentionText ||
                    u.email?.toLowerCase() === mentionText ||
                    u.full_name?.toLowerCase().replace(/\s+/g, '') === mentionText
            );

            if (user) {
                // Replace @username with @user_id
                const start = match.index!;
                const end = start + match[0].length;
                result = `${result.substring(0, start)}@${user.id}${result.substring(end)}`;
            }
        }

        return result;
    }

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

        // Replace @username with @user_id before submitting
        const processedComment = replaceMentionsWithUserIds(commentContents);

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
                    comment_contents: processedComment,
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
        } else if (mentionPosition && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            const filteredUsers = getFilteredUsers();
            if (event.key === 'ArrowDown') {
                setSelectedMentionIndex((prev) => (prev + 1) % filteredUsers.length);
            } else {
                setSelectedMentionIndex((prev) => (
                    (prev - 1 + filteredUsers.length) % filteredUsers.length
                ));
            }
        } else if (mentionPosition && event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const filteredUsers = getFilteredUsers();
            if (filteredUsers.length > 0) {
                insertMention(filteredUsers[selectedMentionIndex]);
            }
        } else if (mentionPosition && event.key === 'Escape') {
            event.preventDefault();
            setMentionPosition(null);
            setMentionQuery('');
        }
    };

    function getFilteredUsers(): User[] {
        if (!mentionQuery) return users.slice(0, 5);
        const query = mentionQuery.toLowerCase();
        return users
            .filter(
                (user) =>
                    user.full_name?.toLowerCase().includes(query) ||
                    user.email?.toLowerCase().includes(query)
            )
            .slice(0, 5);
    }

    function insertMention(user: User) {
        if (!mentionPosition || !textareaRef.current) return;

        const textarea = textareaRef.current;
        const text = commentContents || '';
        const beforeMention = text.substring(0, mentionPosition.start);
        const afterMention = text.substring(mentionPosition.end);
        const newText = `${beforeMention}@${user.full_name || user.email} ${afterMention}`;

        setCommentContents(newText);
        setMentionPosition(null);
        setMentionQuery('');
        setSelectedMentionIndex(0);

        // Set cursor position after the mention
        setTimeout(() => {
            const newCursorPos = beforeMention.length + (
                (user.full_name || user.email).length + 2);
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }

    function handleTextareaChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        const { value } = event.currentTarget;
        const cursorPos = event.currentTarget.selectionStart;
        setCommentContents(value);

        // Check if we're typing a mention
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            // Check if there's a space or newline after @ (if so, not a mention)
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            if (!textAfterAt.match(/[\s\n]/)) {
                // We're in a mention
                const mentionText = textAfterAt;
                setMentionQuery(mentionText);
                setMentionPosition({
                    start: lastAtIndex,
                    end: cursorPos,
                });
                setSelectedMentionIndex(0);
                return;
            }
        }

        // Not in a mention
        setMentionPosition(null);
        setMentionQuery('');
    }

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

            <Card shadow="xs" padding="md" radius="md" withBorder style={{ overflow: 'visible' }}>
                <Stack gap="md" style={{ overflow: 'visible' }}>
                    <div style={{ position: 'relative', zIndex: 1, overflow: 'visible' }}>
                        <Textarea
                          ref={textareaRef}
                          placeholder="Write your comment here... (Press Cmd/Ctrl + Enter to submit). Type @ to mention users."
                          autosize
                          minRows={3}
                          maxRows={8}
                          onChange={handleTextareaChange}
                          onKeyDown={handleKeyDown}
                          value={commentContents}
                          disabled={commentInputLoading}
                        />
                        {mentionPosition && (
                            <Paper
                              shadow="md"
                              p="xs"
                              withBorder
                              style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  right: 0,
                                  marginTop: 4,
                                  zIndex: 9999,
                                  maxHeight: 200,
                                  overflowY: 'auto',
                                  backgroundColor: 'var(--mantine-color-body)',
                              }}
                            >
                                <Stack gap={2}>
                                    {getFilteredUsers().length > 0 ? (
                                        getFilteredUsers().map((user, index) => (
                                            <Button
                                              key={user.id}
                                              variant={index === selectedMentionIndex ? 'light' : 'subtle'}
                                              size="xl"
                                              fullWidth
                                              justify="flex-start"
                                              onClick={() => insertMention(user)}
                                              style={{ textAlign: 'left' }}
                                              onMouseEnter={() => setSelectedMentionIndex(index)}
                                            >
                                                <Group gap="xs" wrap="nowrap" p="md">
                                                    <Avatar size="xs" radius="xl">
                                                        {(user.full_name || user.email)
                                                            .split(' ')
                                                            .map((n) => n[0])
                                                            .join('')
                                                            .toUpperCase()
                                                            .slice(0, 2)}
                                                    </Avatar>
                                                    <div>
                                                        <Text size="sm" fw={500}>
                                                            {user.full_name || user.email}
                                                        </Text>
                                                        {user.full_name && (
                                                            <Text size="xs" c="dimmed">
                                                                {user.email}
                                                            </Text>
                                                        )}
                                                    </div>
                                                </Group>
                                            </Button>
                                        ))
                                    ) : (
                                        <Text size="sm" c="dimmed" p="xs">
                                            No users found
                                        </Text>
                                    )}
                                </Stack>
                            </Paper>
                        )}
                    </div>
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
