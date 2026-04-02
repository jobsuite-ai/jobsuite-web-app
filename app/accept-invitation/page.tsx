'use client';

import { Suspense, useEffect, useState } from 'react';

import { Button, Container, Paper, PasswordInput, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter, useSearchParams } from 'next/navigation';

import { verifyRs256TokenViaApi } from '@/lib/verify-rs256-token-api';

interface TokenPayload {
  exp: number;
  email: string;
  full_name: string;
  role: string;
  contractor_id: string;
  type: string;
}

function AcceptInvitationContent() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.push('/error?message=No invitation token provided');
      return;
    }

    const validateToken = async () => {
      try {
        const raw = await verifyRs256TokenViaApi(token);
        const decoded = raw as unknown as TokenPayload;

        const expiryDate = new Date(Number(decoded.exp) * 1000);
        if (expiryDate < new Date()) {
          router.push('/error?message=Invitation token has expired');
          return;
        }

        setEmail(decoded.email);
        setFullName(decoded.full_name);
        setTokenValid(true);
      } catch (error) {
        router.push(`/error?message=Invalid invitation token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    validateToken();
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      notifications.show({
        title: 'Error',
        message: 'Passwords do not match',
        color: 'red',
      });
      setLoading(false);
      return;
    }

    try {
      const token = searchParams.get('token');
      const response = await fetch('/api/auth/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to set up password');
      }

      await response.json();

      notifications.show({
        title: 'Success',
        message: 'Password set up successfully',
        color: 'green',
      });
      router.push('/ios-app-redirect');
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'An error occurred while setting up your password',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return null;
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900}>
        Set Up Your Account
      </Title>
      <Text ta="center" c="dimmed" size="sm" mt={5}>
        Welcome {fullName}! Please set up your password to complete your account setup.
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            value={email}
            disabled
            mb="md"
          />

          <PasswordInput
            label="Password"
            type="password"
            name="new-password"
            id="password"
            autoComplete="new-password"
            placeholder="Create a password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            mb="md"
          />

          <PasswordInput
            type="password"
            name="confirm-password"
            id="confirm-password"
            autoComplete="new-password"
            label="Confirm Password"
            placeholder="Confirm your password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            mb="xl"
          />

          <Button type="submit" fullWidth loading={loading}>
            Complete Setup
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <Container size={420} my={40}>
        <Text ta="center">Loading...</Text>
      </Container>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
