'use client';

import { Suspense, useEffect } from 'react';

import { Center, Container, Loader, Tabs, Text, Title } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';

import AcceptInvitation from './accept-invitation/page';

import LoginForm from '@/components/AuthButtons/LoginForm';
import RegisterForm from '@/components/AuthButtons/RegisterForm';
import { useAuth } from '@/hooks/useAuth';

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  // If there's a token in the URL, show the accept-invitation page
  if (token) {
    return <AcceptInvitation />;
  }

  // Check if user is authenticated and redirect to profile if so
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.push('/profile');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  if (isAuthLoading || (isAuthenticated && !isAuthLoading)) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900}>
        Welcome to JobSuite
      </Title>
      <Text ta="center" c="dimmed" size="sm" mt={5} mb={30}>
        Log in to your account or create a new contractor account
      </Text>

      <Tabs defaultValue="login">
        <Tabs.List>
          <Tabs.Tab value="login">Log In</Tabs.Tab>
          <Tabs.Tab value="register">Create Account</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="login" pt="xl">
          <LoginForm />
        </Tabs.Panel>

        <Tabs.Panel value="register" pt="xl">
          <RegisterForm />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="xl" />
      </Center>
    }>
      <HomePageContent />
    </Suspense>
  );
}
