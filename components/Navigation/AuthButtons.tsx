'use client';

import { useUser } from '@auth0/nextjs-auth0/client';

import { LoginButton } from '@/components/AuthButtons/login-button';
import { LogoutButton } from '@/components/AuthButtons/logout-button';
import { SignupButton } from '@/components/AuthButtons/signup-button';

export default function AuthButtons() {
  const { user } = useUser();

  return (
    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
      {!user && (
        <>
          <SignupButton />
          <LoginButton />
        </>
      )}
      {user && (
        <>
          <LogoutButton />
        </>
      )}
    </div>
  );
}
