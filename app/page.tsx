'use client';

import { Suspense, useState } from 'react';

import { Center, Container, Loader, Title } from '@mantine/core';
import { useSearchParams } from 'next/navigation';

import AcceptInvitation from './accept-invitation/page';

import LoginForm from '@/components/AuthButtons/LoginForm';
import RegisterForm from '@/components/AuthButtons/RegisterForm';
import Homepage from '@/components/Homepage/Homepage';
import { useAuth } from '@/hooks/useAuth';

function HomePageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [showRegister, setShowRegister] = useState(false);

  // If there's a token in the URL, show the accept-invitation page
  if (token) {
    return <AcceptInvitation />;
  }

  // Check if user is authenticated and show homepage if so
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();

  if (isAuthLoading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  // Show homepage for authenticated users
  if (isAuthenticated) {
    return <Homepage />;
  }

  // Show login/register for unauthenticated users
  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={700} mb="md" c="gray.0">
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
