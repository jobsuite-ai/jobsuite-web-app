import { SingleComment } from '@/components/Global/model';
import { Card, Group, rem, Text } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import { format } from 'date-fns';

export function JobComment({ commentDetails }: { commentDetails: SingleComment }) {
  const dateObj = new Date(commentDetails.timestamp);

  return (
    <Card
      key={commentDetails.id}
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ marginTop: rem(20), marginBottom: rem(20), cursor: 'pointer', width: '700px' }}
    >
      <Group style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
          <IconUser radius="xl" />
          <Text size="sm" pl='md'>{commentDetails.commenter}</Text>
        </div>
        <Text size="xs" c="dimmed">{format(dateObj, 'h:mm:ss a M/d/yy')}</Text>
      </Group>
      <Text pl={54} pt="sm" size="sm">{commentDetails.comment_contents}</Text>
    </Card>
  );
}