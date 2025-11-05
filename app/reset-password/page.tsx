'use client';

import { Suspense, useEffect, useState } from 'react';

import { Button, Container, Paper, PasswordInput, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { importSPKI, jwtVerify } from 'jose';
import { useRouter, useSearchParams } from 'next/navigation';

interface TokenPayload {
  exp: number;
  email: string;
  type: string;
}

const keyBase64 = process.env.NEXT_PUBLIC_JWT_PUBLIC_KEY_BASE64!;
const JWT_PUBLIC_KEY = Buffer.from(keyBase64, 'base64').toString('utf-8');

async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const publicKey = await importSPKI(JWT_PUBLIC_KEY, 'RS256');
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
    });

    return payload as unknown as TokenPayload;
  } catch (error) {
    throw new Error(`Invalid token format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function ResetPasswordContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.push('/error?message=No password reset token provided');
      return;
    }

    const validateToken = async () => {
      try {
        // Verify the JWT token
        const decoded = await verifyToken(token);

        // Check if token is expired
        const expiryDate = new Date(decoded.exp * 1000); // Convert Unix timestamp to milliseconds
        if (expiryDate < new Date()) {
          router.push('/error?message=Password reset token has expired');
          return;
        }

        // Verify token type
        if (decoded.type !== 'password_reset') {
          router.push('/error?message=Invalid token type');
          return;
        }

        setEmail(decoded.email);
        setTokenValid(true);
      } catch (error) {
        router.push(`/error?message=Invalid password reset token: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    if (password.length < 8) {
      notifications.show({
        title: 'Error',
        message: 'Password must be at least 8 characters long',
        color: 'red',
      });
      setLoading(false);
      return;
    }

    try {
      const token = searchParams.get('token');
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to reset password');
      }

      await response.json();

      notifications.show({
        title: 'Success',
        message: 'Password reset successfully',
        color: 'green',
      });
      router.push('/');
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'An error occurred while resetting your password',
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
        Reset Your Password
      </Title>
      <Text ta="center" c="dimmed" size="sm" mt={5}>
        Please enter your new password below.
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
            label="New Password"
            type="password"
            name="new-password"
            id="password"
            autoComplete="new-password"
            placeholder="Enter your new password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            mb="md"
            minLength={8}
          />

          <PasswordInput
            type="password"
            name="confirm-password"
            id="confirm-password"
            autoComplete="new-password"
            label="Confirm New Password"
            placeholder="Confirm your new password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            mb="xl"
            minLength={8}
          />

          <Button type="submit" fullWidth loading={loading}>
            Reset Password
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Container size={420} my={40}>
        <Text ta="center">Loading...</Text>
      </Container>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
