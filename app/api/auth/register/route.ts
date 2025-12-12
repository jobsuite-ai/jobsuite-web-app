import { NextResponse } from 'next/server';

import { getApiBaseUrl } from '../utils/serviceAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password: encryptedPassword, full_name, role, contractor_id } = body;

    if (!email || !encryptedPassword || !full_name || !role) {
      return NextResponse.json(
        { message: 'Email, password, full_name, and role are required' },
        { status: 400 }
      );
    }

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: encryptedPassword,
        full_name,
        role,
        contractor_id: contractor_id || null,
        is_active: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.detail || data.message || 'Registration failed' },
        { status: response.status }
      );
    }

    // After registration, automatically login the user
    // First, we need to login to get the tokens
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', email);
    formData.append('password', encryptedPassword);
    formData.append('scope', '');
    formData.append('client_id', 'string');
    formData.append('client_secret', 'string');

    const loginResponse = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      // User created but login failed, return user data
      return NextResponse.json({
        user: data,
        message: 'User created successfully, but login failed. Please login manually.',
      });
    }

    // Return both user and token data
    return NextResponse.json({
      user: data,
      ...loginData,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
