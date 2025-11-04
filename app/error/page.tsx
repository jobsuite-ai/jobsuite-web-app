'use client';

import { Container, Title, Text } from '@mantine/core';
import { IconExclamationCircle } from '@tabler/icons-react';
import { useSearchParams } from 'next/navigation';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || 'An error occurred';

  return (
    <Container size={420} my={40}>
      <IconExclamationCircle color="#FF7F7F" size={180} style={{ margin: '0 auto', display: 'block' }} />
      <Title ta="center" fw={900}>
        Error
      </Title>
      <Text ta="center" c="dimmed" size="sm" mt={5}>
        {message}
      </Text>
    </Container>
  );
}
