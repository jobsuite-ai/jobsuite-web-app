/**
 * Service Account Authentication Utility
 *
 * This module provides secure authentication for server-side operations
 * (like webhooks) that need to call the job engine API without user context.
 *
 * It supports:
 * - Amplify-injected secrets (from AWS Secrets Manager via Amplify Console)
 * - Environment variables for local development
 * - Token caching with automatic refresh
 */

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

interface ServiceAccountCredentials {
  email: string;
  password: string;
}

let tokenCache: TokenCache | null = null;
let credentialsCache: ServiceAccountCredentials | null = null;

export const getApiBaseUrl = () => {
  // Local development - check if we're running locally
  if (process.env.IS_LOCAL_ENV === 'true' && !process.env.AWS_BRANCH && !process.env.AMPLIFY_BRANCH) {
    const url = process.env.JOB_ENGINE_LOCAL_URL || 'http://localhost:8000';
    // eslint-disable-next-line no-console
    console.log('Local mode detected');
    return url;
  }

  // Use AWS_BRANCH or AMPLIFY_BRANCH to determine environment
  // Note: main branch uses QA endpoints, not production
  const branch = process.env.AWS_BRANCH || process.env.AMPLIFY_BRANCH;

  // Production - only if branch is explicitly 'production' or 'prod'
  if (branch === 'production' || branch === 'prod') {
    return 'https://api.jobsuite.app';
  }

  // QA/Development - main, qa, staging branches all use QA endpoints
  if (branch === 'qa' || branch === 'main' || branch === 'staging') {
    return 'https://qa.api.jobsuite.app';
  }

  // Default to QA for unknown branches (safer than defaulting to production)
  return 'https://qa.api.jobsuite.app';
};

/**
 * Get service account credentials from multiple sources in priority order:
 * 1. Amplify-injected secrets (if Amplify references Secrets Manager)
 * 2. Direct AWS Secrets Manager access (if secret name is provided)
 * 3. Environment variables (for local development)
 *
 * Credentials are cached to avoid repeated Secrets Manager calls.
 *
 * @returns Promise<ServiceAccountCredentials> The service account credentials
 * @throws Error if credentials cannot be retrieved
 */
async function getServiceAccountCredentials(): Promise<ServiceAccountCredentials> {
  // Return cached credentials if available
  if (credentialsCache) {
    return credentialsCache;
  }

  // Priority 1: Check if Amplify has already injected the secrets as environment variables
  // When Amplify references a Secrets Manager secret, it injects the values
  // as environment variables. We check for the individual fields.
  const amplifyInjectedEmail = process.env.WEBHOOK_EMAIL;
  const amplifyInjectedPassword = process.env.WEBHOOK_PASSWORD;

  // If both are available, Amplify likely injected them from Secrets Manager
  if (amplifyInjectedEmail && amplifyInjectedPassword) {
    credentialsCache = {
      email: amplifyInjectedEmail,
      password: amplifyInjectedPassword,
    };
    return credentialsCache;
  }

  // Priority 3: Fall back to environment variables (for local development)
  const email = process.env.SERVICE_ACCOUNT_EMAIL;
  const password = process.env.SERVICE_ACCOUNT_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Service account credentials not configured. ' +
      'Please set one of:\n' +
      '  - SERVICE_ACCOUNT_EMAIL and SERVICE_ACCOUNT_PASSWORD (Amplify-injected or env vars), or\n' +
      '  - SERVICE_ACCOUNT_SECRET_NAME (for direct Secrets Manager access)'
    );
  }

  credentialsCache = { email, password };
  return credentialsCache;
}

/**
 * Get a valid access token for service account authentication.
 * Uses cached token if available and not expired, otherwise fetches a new one.
 *
 * @returns Promise<string> The access token
 * @throws Error if service account credentials are not configured or authentication fails
 */
export async function getServiceAccountToken(): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
    // Token is valid for at least another minute
    return tokenCache.accessToken;
  }

  // Get service account credentials (from Secrets Manager or environment variables)
  const { email: serviceAccountEmail, password: serviceAccountPassword } =
    await getServiceAccountCredentials();

  // Authenticate with the job engine API
  const apiBaseUrl = getApiBaseUrl();
  const formData = new URLSearchParams();
  formData.append('grant_type', 'password');
  formData.append('username', serviceAccountEmail);
  formData.append('password', serviceAccountPassword);
  formData.append('scope', '');
  formData.append('client_id', 'string');
  formData.append('client_secret', 'string');

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
      throw new Error(
        `Service account authentication failed: ${errorData.detail || errorData.error || 'Unknown error'}`
      );
    }

    const tokenData = await response.json();

    if (!tokenData.access_token) {
      throw new Error('Service account authentication failed: No access token in response');
    }

    // Cache the token with expiration (default to 50 minutes to be safe)
    // Access tokens typically expire in 60 minutes
    const expiresIn = 50 * 60 * 1000; // 50 minutes in milliseconds
    tokenCache = {
      accessToken: tokenData.access_token,
      expiresAt: Date.now() + expiresIn,
    };

    return tokenCache.accessToken;
  } catch (error: any) {
    // Clear cache on error
    tokenCache = null;

    if (error.message) {
      throw error;
    }

    throw new Error(`Failed to authenticate service account: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Clear the cached token (useful for testing or forced refresh)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}

/**
 * Clear the cached credentials (useful for testing or when secrets are rotated)
 */
export function clearCredentialsCache(): void {
  credentialsCache = null;
  tokenCache = null; // Also clear token cache since credentials changed
}

/**
 * Helper function to identify the current IAM role/identity.
 * Useful for debugging IAM permission issues.
 *
 * @returns Promise<string> Information about the current AWS identity
 */
export async function getCurrentAWSIdentity(): Promise<string> {
  try {
    // This requires @aws-sdk/client-sts, but we can use a simple fetch to the metadata service
    // For Lambda/ECS, we can check the execution role
    if (process.env.AWS_EXECUTION_ENV) {
      // Running in Lambda or ECS
      const roleArn = process.env.AWS_EXECUTION_ENV;
      return `Execution Environment: ${roleArn}`;
    }

    // Try to get role from metadata service (works in EC2/ECS/Lambda)
    try {
      const response = await fetch('http://169.254.169.254/latest/meta-data/iam/security-credentials/', {
        signal: AbortSignal.timeout(1000), // 1 second timeout
      });
      if (response.ok) {
        const roleName = await response.text();
        return `IAM Role: ${roleName.trim()}`;
      }
    } catch {
      // Metadata service not available (not running on AWS infrastructure)
    }

    // Check for explicit role ARN in environment
    if (process.env.AWS_ROLE_ARN) {
      return `Role ARN: ${process.env.AWS_ROLE_ARN}`;
    }

    return 'Unable to determine IAM role. Check AWS Console or use AWS CLI: aws sts get-caller-identity';
  } catch (error: any) {
    return `Error getting identity: ${error.message}`;
  }
}
