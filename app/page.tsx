'use client';

import { Suspense, useEffect, useState } from 'react';

import { Center, Container, Loader, Title } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';

import AcceptInvitation from './accept-invitation/page';

import LoginForm from '@/components/AuthButtons/LoginForm';
import RegisterForm from '@/components/AuthButtons/RegisterForm';
import { useAuth } from '@/hooks/useAuth';

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [showRegister, setShowRegister] = useState(false);

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
      <Title ta="center" fw={700} mb="md">
        Welcome to JobSuite
      </Title>
      {showRegister ? (
        <RegisterForm onShowLogin={() => setShowRegister(false)} />
      ) : (
        <LoginForm onShowRegister={() => setShowRegister(true)} />
      )}
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
