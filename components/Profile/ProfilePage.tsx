"use client";

import AuthButtons from "@/components/Navigation/AuthButtons";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Loader, rem } from "@mantine/core";

export default function ProfilePage() {
    const { user, error, isLoading } = useUser();

    if (isLoading) return <Loader color="blue" size="xl" style={{ display: 'flex', justifySelf: 'center', marginTop: rem(150) }} />
    if (error) return <h1 style={{ textAlign: 'center' }}>{error.message}</h1>

    return (
        <>
            {user ? (
                <>
                    <h1 style={{ textAlign: 'center', marginTop: rem(100) }}>You are logged in</h1>
                    <h1 style={{ textAlign: 'center' }}>Welcome, {user.name}!</h1>
                </>
            ) : (
                <h1 style={{ textAlign: 'center', marginTop: rem(100) }}>Please sign up or login to view jobs.</h1>
            )
            }
            <AuthButtons />
        </>
    );
};
