import { clearCachedContractorId } from '@/app/utils/apiClient';
import { clearAccessTokenMetadata } from '@/app/utils/authToken';
import { clearCachedAuthMe } from '@/app/utils/dataCache';

/**
 * Clears tokens and cached auth/contractor state (same contract as useAuth logout).
 */
export function clearClientAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  clearAccessTokenMetadata();
  clearCachedAuthMe();
  clearCachedContractorId();
  window.dispatchEvent(new Event('localStorageChange'));
}

/** Full reload so root page re-evaluates auth and shows the login form. */
export function redirectToLoginPage(): void {
  window.location.assign('/');
}

export function getApiErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') {
    return '';
  }
  const o = body as Record<string, unknown>;
  if (typeof o.message === 'string') {
    return o.message;
  }
  if (typeof o.detail === 'string') {
    return o.detail;
  }
  return '';
}

/**
 * Expired/invalid tokens: 401, or 400 with "no contractor ID" when /users/me fails.
 */
export function shouldInvalidateSessionFromApi(response: Response, body: unknown): boolean {
  if (response.status === 401) {
    return true;
  }
  if (response.status !== 400) {
    return false;
  }
  const msg = getApiErrorMessage(body).toLowerCase();
  return msg.includes('does not have a contractor id');
}

/**
 * Clears session and navigates to `/` (login). Call when shouldInvalidateSessionFromApi is true.
 * @returns true if redirect was triggered (caller should stop updating UI).
 */
export function invalidateSessionAndRedirectToLogin(
  response: Response,
  body: unknown
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (!shouldInvalidateSessionFromApi(response, body)) {
    return false;
  }
  clearClientAuthSession();
  redirectToLoginPage();
  return true;
}
