'use client';

import { useState } from 'react';

import { Anchor, Button, Container, Paper, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send password reset email');
      }

      setSubmitted(true);
      notifications.show({
        title: 'Success',
        message: 'If an account with that email exists, a password reset link has been sent.',
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'An error occurred while requesting password reset',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Container size={420} my={40}>
        <Title ta="center" fw={900}>
          Check Your Email
        </Title>
        <Text ta="center" c="dimmed" size="sm" mt={5} mb={30}>
          If an account with that email exists, we&apos;ve sent you a password reset link.
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Text ta="center" size="sm" mb="md">
            Please check your email and click the link to reset your password.
          </Text>
          <Text ta="center" size="sm" c="dimmed" mb="xl">
            The link will expire in 1 hour.
          </Text>

          <Button
            fullWidth
            variant="light"
            onClick={() => router.push('/')}
          >
            Back to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900}>
        Forgot Password
      </Title>
      <Text ta="center" c="dimmed" size="sm" mt={5} mb={30}>
        Enter your email address and we&apos;ll send you a link to reset your password.
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            type="email"
            placeholder="your.email@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            mb="xl"
            autoComplete="email"
          />

          <Button type="submit" fullWidth loading={loading}>
            Send Reset Link
          </Button>

          <Anchor
            component="button"
            type="button"
            size="sm"
            mt="md"
            ta="center"
            onClick={() => router.push('/')}
            style={{ cursor: 'pointer', display: 'block', width: '100%' }}
          >
            Back to Login
          </Anchor>
        </form>
      </Paper>
    </Container>
  );
}
