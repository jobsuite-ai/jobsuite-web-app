"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import React from "react";
import { SignupButton } from "@/components/auth-buttons/signup-button";
import { LoginButton } from "@/components/auth-buttons/login-button";
import { LogoutButton } from "@/components/auth-buttons/logout-button";

export const AuthButtons = () => {
  const { user } = useUser();

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
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
};