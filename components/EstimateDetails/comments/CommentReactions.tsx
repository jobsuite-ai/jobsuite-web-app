'use client';

import { useState } from 'react';

import {
    ActionIcon,
    Button,
    Group,
    Popover,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMoodSmile } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';
import { SingleComment, User } from '@/components/Global/model';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';

const QUICK_REACTIONS = ['👍', '❤️', '👎', '😮', '😢', '👏'];

const COMMON_EMOJIS = [
    '👍', '👎', '❤️', '😊', '😄', '😍', '🤔', '😅',
    '🙌', '👏', '🎉', '✅', '❌', '⚠️', '💡', '🔥',
    '💪', '🚀', '⭐', '✨', '💯', '🎯', '🙏', '😎',
];

interface CommentReactionsProps {
    comment: SingleComment;
    estimateId: string;
    onReactionUpdated?: (updatedComment: SingleComment) => void;
}

export function CommentReactions({
    comment,
    estimateId,
    onReactionUpdated,
}: CommentReactionsProps) {
    const { user } = useAuth({ fetchUser: true });
    const { users } = useUsers();
    const [loading, setLoading] = useState<string | null>(null);
    const [emojiPickerOpened, setEmojiPickerOpened] = useState(false);

    // Group reactions by emoji
    const reactionsByEmoji = new Map<string, Array<{ user_id: string; emoji: string }>>();
    if (comment.reactions) {
        for (const reaction of comment.reactions) {
            const existing = reactionsByEmoji.get(reaction.emoji) || [];
            existing.push(reaction);
            reactionsByEmoji.set(reaction.emoji, existing);
        }
    }

    // Get all unique emojis that have reactions, sorted by count (descending)
    const reactedEmojis = Array.from(reactionsByEmoji.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .map(([emoji]) => emoji);

    // Check if current user has reacted with a specific emoji
    const hasUserReacted = (emoji: string): boolean => {
        if (!user || !comment.reactions) return false;
        return comment.reactions.some(
            (r) => r.user_id === user.id && r.emoji === emoji
        );
    };

    // Get users who reacted with a specific emoji
    const getUsersForEmoji = (emoji: string): User[] => {
        const reactions = reactionsByEmoji.get(emoji) || [];
        return reactions
            .map((r) => users.find((u) => u.id === r.user_id))
            .filter((u): u is User => u !== undefined);
    };

    const handleReaction = async (emoji: string) => {
        if (!user) {
            notifications.show({
                title: 'Authentication Error',
                message: 'Please log in to react to comments.',
                color: 'red',
            });
            return;
        }

        setLoading(emoji);
        try {
            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
                notifications.show({
                    title: 'Authentication Error',
                    message: 'Please log in to react to comments.',
                    color: 'red',
                });
                return;
            }

            const response = await fetch(
                `/api/estimate-comments/${estimateId}/${comment.id}/reactions`,
                {
                    method: 'POST',
                    headers: getApiHeaders(),
                    body: JSON.stringify({ emoji }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add reaction');
            }

            // Get updated comment from response
            const updatedComment = await response.json();
            const mappedComment: SingleComment = {
                ...comment,
                reactions: updatedComment.reactions || [],
            };

            // Notify parent with updated comment
            onReactionUpdated?.(mappedComment);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error instanceof Error ? error.message : 'Failed to add reaction',
                color: 'red',
            });
        } finally {
            setLoading(null);
        }
    };

    return (
        <Group gap="xs" mt="xs" pl={48}>
            {/* Display existing reactions */}
            {reactedEmojis.map((emoji) => {
                const reactions = reactionsByEmoji.get(emoji) || [];
                const count = reactions.length;
                const userReacted = hasUserReacted(emoji);
                const usersForEmoji = getUsersForEmoji(emoji);

                return (
                    <Tooltip
                      key={emoji}
                      label={
                            usersForEmoji.length > 0 ? (
                                <Stack gap={4}>
                                    {usersForEmoji.slice(0, 5).map((u) => (
                                        <Text key={u.id} size="xs">
                                            {u.full_name || u.email}
                                        </Text>
                                    ))}
                                    {usersForEmoji.length > 5 && (
                                        <Text size="xs" c="dimmed">
                                            +{usersForEmoji.length - 5} more
                                        </Text>
                                    )}
                                </Stack>
                            ) : (
                                ''
                            )
                        }
                      withArrow
                      position="top"
                    >
                        <Button
                          variant={userReacted ? 'light' : 'subtle'}
                          size="xs"
                          onClick={() => handleReaction(emoji)}
                          loading={loading === emoji}
                          disabled={loading !== null}
                          style={{
                                fontWeight: userReacted ? 600 : 400,
                                opacity: userReacted ? 1 : 0.8,
                            }}
                        >
                            {emoji} {count}
                        </Button>
                    </Tooltip>
                );
            })}

            {/* Quick reaction buttons */}
            {QUICK_REACTIONS.map((emoji) => {
                // Only show if not already displayed as a reaction
                if (reactedEmojis.includes(emoji)) return null;

                return (
                    <ActionIcon
                      key={emoji}
                      variant="subtle"
                      size="sm"
                      onClick={() => handleReaction(emoji)}
                      loading={loading === emoji}
                      disabled={loading !== null}
                      style={{ fontSize: '1.2rem' }}
                    >
                        {emoji}
                    </ActionIcon>
                );
            })}

            {/* More emoji picker */}
            <Popover
              opened={emojiPickerOpened}
              onChange={setEmojiPickerOpened}
              position="top-start"
              withArrow
            >
                <Popover.Target>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => setEmojiPickerOpened((o) => !o)}
                      disabled={loading !== null}
                    >
                        <IconMoodSmile size={16} />
                    </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown>
                    <div
                      style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(6, 1fr)',
                            gap: 8,
                            width: 240,
                        }}
                    >
                        {COMMON_EMOJIS.map((emoji) => {
                            // Skip quick reactions that are already shown
                            if (QUICK_REACTIONS.includes(emoji) && !reactedEmojis.includes(emoji)) {
                                return null;
                            }
                            return (
                                <ActionIcon
                                  key={emoji}
                                  variant="subtle"
                                  size="lg"
                                  onClick={() => {
                                        handleReaction(emoji);
                                        setEmojiPickerOpened(false);
                                    }}
                                  disabled={loading !== null}
                                  style={{ fontSize: '1.5rem', cursor: 'pointer' }}
                                >
                                    {emoji}
                                </ActionIcon>
                            );
                        })}
                    </div>
                </Popover.Dropdown>
            </Popover>
        </Group>
    );
}
