'use client';

import { useRouter } from 'next/navigation';
import { Loader, rem, Container, Title, Text, Paper, Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, error } = useAuth({ 
    requireAuth: true,
    fetchUser: true,
  });

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/');
  };

  // Show error notification if there's an error
  if (error && !isLoading) {
    notifications.show({
      title: 'Error',
      message: error,
      color: 'red',
    });
  }

  if (isLoading) {
    return (
      <Container size="sm" style={{ marginTop: rem(150) }}>
        <Loader color="blue" size="xl" style={{ display: 'flex', justifyContent: 'center' }} />
      </Container>
    );
  }

  if (error && !user && !isLoading) {
    return (
      <Container size="sm" style={{ marginTop: rem(100) }}>
        <Text ta="center" c="red" size="lg">
          {error}
        </Text>
        <Button fullWidth mt="md" onClick={() => router.push('/')}>
          Go to Login
        </Button>
      </Container>
    );
  }

  return (
    <Container size="sm" style={{ marginTop: rem(50) }}>
      <Paper withBorder shadow="md" p={30} radius="md">
        <Title ta="center" fw={900} mb="xl">
          Profile
        </Title>

        {user ? (
          <>
            <Text ta="center" size="lg" mb="md">
              You are logged in
            </Text>
            <Text ta="center" size="xl" fw={600} mb="md">
              Welcome, {user.full_name || user.email}!
            </Text>

            <div style={{ marginTop: rem(30) }}>
              <Text size="sm" c="dimmed" mb={5}>
                <strong>Email:</strong> {user.email}
              </Text>
              {user.full_name && (
                <Text size="sm" c="dimmed" mb={5}>
                  <strong>Full Name:</strong> {user.full_name}
                </Text>
              )}
              <Text size="sm" c="dimmed" mb={5}>
                <strong>Role:</strong> {user.role}
              </Text>
              {user.contractor_id && (
                <Text size="sm" c="dimmed" mb={5}>
                  <strong>Contractor ID:</strong> {user.contractor_id}
                </Text>
              )}
            </div>

            <Button fullWidth mt="xl" onClick={handleLogout} variant="outline" color="red">
              Logout
            </Button>
          </>
        ) : (
          <Text ta="center" c="dimmed" size="lg">
            Please sign up or login to view your profile.
          </Text>
        )}
      </Paper>
    </Container>
  );
}