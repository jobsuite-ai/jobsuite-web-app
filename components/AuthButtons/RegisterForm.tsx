'use client';

import { useState } from 'react';

import { Anchor, Button, Paper, PasswordInput, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

import { encryptPassword } from '@/app/utils/encryption';

interface RegisterFormProps {
  onShowLogin?: () => void;
}

export default function RegisterForm({ onShowLogin }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      // Try to encrypt the password, but fall back to plain password if encryption fails
      let passwordToSend: string;
      try {
        passwordToSend = await encryptPassword(password);
      } catch (encryptError) {
        // If encryption fails (e.g., key not configured), send plain password
        console.warn('Password encryption failed, sending plain password:', encryptError);
        passwordToSend = password;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: passwordToSend,
          full_name: fullName,
          role: 'contractor',
          contractor_id: contractorId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Store tokens in localStorage if available
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        // Dispatch custom event to notify other components (e.g., Header)
        window.dispatchEvent(new Event('localStorageChange'));
      }
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }

      notifications.show({
        title: 'Success',
        message: 'Account created successfully',
        color: 'green',
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'An error occurred during registration',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <Title order={4} ta="center" mb="md">Create a new contractor account</Title>
      <form onSubmit={handleSubmit}>
        <TextInput
          label="Full Name"
          placeholder="John Doe"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          mb="md"
          autoComplete="name"
        />

        <TextInput
          label="Email"
          type="email"
          placeholder="your.email@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          mb="md"
          autoComplete="email"
        />

        <PasswordInput
          label="Password"
          placeholder="Create a password (min 8 characters)"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          mb="md"
          autoComplete="new-password"
        />

        <PasswordInput
          label="Confirm Password"
          placeholder="Confirm your password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          mb="md"
          autoComplete="new-password"
        />

        <TextInput
          label="Contractor ID (Optional)"
          placeholder="Leave blank if creating new contractor"
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value)}
          mb="xl"
        />

        <Button type="submit" fullWidth loading={loading}>
          Create Account
        </Button>

        {onShowLogin && (
          <Anchor
            component="button"
            type="button"
            size="sm"
            ta="center"
            mt="md"
            onClick={onShowLogin}
            style={{ cursor: 'pointer', display: 'block' }}
          >
            Already have an account? Log in
          </Anchor>
        )}
      </form>
    </Paper>
  );
}
