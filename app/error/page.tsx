'use client';

import { Container, Title, Text, Button, Paper } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconExclamationCircle } from '@tabler/icons-react';

export default function ErrorPage() {
  const router = useRouter();
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