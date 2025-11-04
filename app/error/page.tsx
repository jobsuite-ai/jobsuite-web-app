'use client';

import { Suspense } from 'react';

import { Container, Text, Title } from '@mantine/core';
import { IconExclamationCircle } from '@tabler/icons-react';
import { useSearchParams } from 'next/navigation';

function ErrorContent() {
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

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <Container size={420} my={40}>
        <Text ta="center">Loading...</Text>
      </Container>
    }>
      <ErrorContent />
    </Suspense>
  );
}
