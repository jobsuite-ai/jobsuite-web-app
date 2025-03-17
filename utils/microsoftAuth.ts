import * as msal from '@azure/msal-browser';

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: '5b525ee8-bed9-4442-9248-c4d5e43880a1',
    authority: 'https://login.microsoftonline.com/organizations',
    redirectUri: `${process.env.NEXT_PUBLIC_AUTH_LOGOUT_URI}/api/auth/microsoft-callback`,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

// Create the MSAL application object
let msalInstance: msal.PublicClientApplication | null = null;
let isInitialized = false;

// Initialize MSAL
export async function getMsalInstance() {
  if (!msalInstance && typeof window !== 'undefined') {
    msalInstance = new msal.PublicClientApplication(msalConfig);

    // Important: Initialize the MSAL instance
    if (!isInitialized) {
      await msalInstance.initialize();
      isInitialized = true;
    }
  }
  return msalInstance;
}

// Login function
export async function login() {
  const instance = await getMsalInstance();
  if (!instance) return null;

  try {
    const response = await instance.loginPopup({
      scopes: ['https://graph.microsoft.com/Calendars.ReadWrite'],
      prompt: 'select_account',
    });

    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return null;
  }
}

// Get token function
export async function getToken() {
  const instance = await getMsalInstance();
  if (!instance) return null;

  const accounts = instance.getAllAccounts();
  if (accounts.length === 0) {
    return login();
  }

  try {
    return await instance.acquireTokenSilent({
      scopes: ['https://graph.microsoft.com/Calendars.ReadWrite'],
      account: accounts[0],
    });
  } catch (error) {
    console.error('Silent token acquisition failed, using popup:', error);
    return login();
  }
}

// Logout function
export async function logout() {
  const instance = await getMsalInstance();
  if (!instance) return;

  const logoutRequest = {
    account: instance.getActiveAccount() || instance.getAllAccounts()[0],
    postLogoutRedirectUri: `${process.env.NEXT_PUBLIC_AUTH_LOGOUT_URI}/api/auth/microsoft-logout`,
  };

  try {
    await instance.logoutRedirect(logoutRequest);
  } catch (error) {
    console.error('Error during logout:', error);

    // Fallback if redirect logout fails
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/microsoft-logout';
    }
  }
}
