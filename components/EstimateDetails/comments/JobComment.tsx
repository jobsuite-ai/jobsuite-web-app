'use client';

import { useEffect, useState } from 'react';

import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  rem,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconClock, IconEdit, IconTrash, IconX, IconCheck } from '@tabler/icons-react';
import { format } from 'date-fns';

import { CommentReactions } from './CommentReactions';

import { getApiHeaders } from '@/app/utils/apiClient';
import { SingleComment } from '@/components/Global/model';
import { useAuth } from '@/hooks/useAuth';

interface JobCommentProps {
  commentDetails: SingleComment;
  estimateId: string;
  onCommentUpdated?: () => void;
  /** When true, show an "Event" badge (used in Activity "All" view for system comments) */
  showEventBadge?: boolean;
}

export function JobComment({
    commentDetails,
    estimateId,
    onCommentUpdated,
    showEventBadge = false,
}: JobCommentProps) {
  const { user } = useAuth({ fetchUser: true });
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(commentDetails.comment_contents);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentComment, setCurrentComment] = useState<SingleComment>(commentDetails);

  const isSystemComment = currentComment.commenter === 'System';
  // Check if current user is the comment author (system comments are not editable)
  const isCommentAuthor = !isSystemComment && user?.id &&
    currentComment.user_id && user.id === currentComment.user_id;

  // Update current comment when commentDetails prop changes
  useEffect(() => {
    setCurrentComment(commentDetails);
  }, [commentDetails]);

  const dateObj = new Date(currentComment.timestamp);
  const updatedDateObj = currentComment.updated_at ? new Date(currentComment.updated_at) : null;
  const isEdited = updatedDateObj && updatedDateObj.getTime() !== dateObj.getTime();

  const initials = currentComment.commenter
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleEdit = () => {
    setEditedContent(currentComment.comment_contents);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedContent(currentComment.comment_contents);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editedContent.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Comment cannot be empty',
        color: 'red',
      });
      return;
    }

    setIsSaving(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        notifications.show({
          title: 'Authentication Error',
          message: 'Please log in to edit comments.',
          color: 'red',
        });
        return;
      }

      const response = await fetch(
        `/api/estimate-comments/${estimateId}/${currentComment.id}`,
        {
          method: 'PUT',
          headers: getApiHeaders(),
          body: JSON.stringify({
            comment_contents: editedContent,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update comment');
      }

      const updatedComment = await response.json();
      setCurrentComment({
        ...currentComment,
        comment_contents: updatedComment.comment_contents,
        updated_at: updatedComment.updated_at,
      });

      notifications.show({
        title: 'Success',
        message: 'Comment updated successfully',
        color: 'green',
      });

      setIsEditing(false);
      onCommentUpdated?.();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update comment',
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteModal(false);
    setIsDeleting(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        notifications.show({
          title: 'Authentication Error',
          message: 'Please log in to delete comments.',
          color: 'red',
        });
        return;
      }

      const response = await fetch(
        `/api/estimate-comments/${estimateId}/${currentComment.id}`,
        {
          method: 'DELETE',
          headers: getApiHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete comment');
      }

      notifications.show({
        title: 'Success',
        message: 'Comment deleted successfully',
        color: 'green',
      });

      onCommentUpdated?.();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete comment',
        color: 'red',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReactionUpdated = (updatedComment: SingleComment) => {
    // Update local state with new reactions
    setCurrentComment(updatedComment);
    // Also trigger parent refresh to ensure consistency
    onCommentUpdated?.();
  };

  return (
    <Card
      key={currentComment.id}
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
              {initials}
            </Avatar>
            <div>
              <Group gap="xs" align="center" wrap="nowrap">
                <Text size="sm" fw={500} lineClamp={1}>
                  {currentComment.commenter}
                </Text>
                {showEventBadge && (
                  <Badge size="xs" variant="light" color="gray">
                    Event
                  </Badge>
                )}
              </Group>
              <Group gap={4} mt={2}>
                <IconClock size={12} style={{ opacity: 0.6 }} />
                <Text size="xs" c="dimmed">
                  {format(dateObj, 'MMM d, yyyy')} at {format(dateObj, 'h:mm a')}
                </Text>
                {isEdited && updatedDateObj && (
                  <>
                    <Text size="xs" c="dimmed">•</Text>
                    <Text size="xs" c="dimmed">
                      Edited {format(updatedDateObj, 'MMM d, yyyy')} at {format(updatedDateObj, 'h:mm a')}
                    </Text>
                  </>
                )}
              </Group>
            </div>
          </Group>
          {!isEditing && (
            <Group gap="xs">
              {isCommentAuthor && (
                <>
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={handleEdit}
                    size="sm"
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={handleDeleteClick}
                    loading={isDeleting}
                    size="sm"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </>
              )}
            </Group>
          )}
        </Group>
        {isEditing ? (
          <Stack gap="xs" pl={rem(48)}>
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.currentTarget.value)}
              placeholder="Edit your comment..."
              autosize
              minRows={3}
              maxRows={10}
            />
            <Group justify="flex-end" gap="xs">
              <Button
                variant="subtle"
                size="xs"
                onClick={handleCancel}
                disabled={isSaving}
                leftSection={<IconX size={14} />}
              >
                Cancel
              </Button>
              <Button
                size="xs"
                onClick={handleSave}
                loading={isSaving}
                leftSection={<IconCheck size={14} />}
              >
                Save
              </Button>
            </Group>
          </Stack>
        ) : (
          <Text
            size="sm"
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
            pl={rem(48)}
          >
            {currentComment.comment_contents}
          </Text>
        )}
        <CommentReactions
          comment={currentComment}
          estimateId={estimateId}
          onReactionUpdated={handleReactionUpdated}
        />
      </Stack>
      <Modal
        opened={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Comment"
        centered
      >
        <Stack gap="md">
          <Text>Are you sure you want to delete this comment? This action cannot be undone.</Text>
          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDeleteConfirm}
              loading={isDeleting}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
