'use client';

import { useState } from 'react';

import { Button, Paper, PasswordInput, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

import { encryptPassword } from '@/app/utils/encryption';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: passwordToSend }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store tokens in localStorage
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
        message: 'Login successful',
        color: 'green',
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'An error occurred during login',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <form onSubmit={handleSubmit}>
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
          placeholder="Enter your password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          mb="xl"
          autoComplete="current-password"
        />

        <Button type="submit" fullWidth loading={loading}>
          Log In
        </Button>
      </form>
    </Paper>
  );
}
