import { Avatar, Card, Group, Stack, Text, rem } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { format } from 'date-fns';

import { SingleComment } from '@/components/Global/model';

export function JobComment({ commentDetails }: { commentDetails: SingleComment }) {
  const dateObj = new Date(commentDetails.timestamp);
  const initials = commentDetails.commenter
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      key={commentDetails.id}
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
              <Text size="sm" fw={500} lineClamp={1}>
                {commentDetails.commenter}
              </Text>
              <Group gap={4} mt={2}>
                <IconClock size={12} style={{ opacity: 0.6 }} />
                <Text size="xs" c="dimmed">
                  {format(dateObj, 'MMM d, yyyy')} at {format(dateObj, 'h:mm a')}
                </Text>
              </Group>
            </div>
          </Group>
        </Group>
        <Text
          size="sm"
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
          pl={rem(48)}
        >
          {commentDetails.comment_contents}
        </Text>
      </Stack>
    </Card>
  );
}
