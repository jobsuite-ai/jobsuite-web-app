import { NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET() {
  const branch = process.env.AWS_BRANCH || process.env.AMPLIFY_BRANCH;
  const apiBaseUrl = getApiBaseUrl();

  return NextResponse.json({
    branch: branch || 'not set',
    AWS_BRANCH: process.env.AWS_BRANCH || 'not set',
    AMPLIFY_BRANCH: process.env.AMPLIFY_BRANCH || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    resolvedApiUrl: apiBaseUrl,
    hasWebhookEmail: !!process.env.WEBHOOK_EMAIL,
    hasWebhookPassword: !!process.env.WEBHOOK_PASSWORD,
    allEnvVars: {
      // Only show relevant env vars (not secrets)
      IS_LOCAL_ENV: process.env.IS_LOCAL_ENV,
      JOB_ENGINE_LOCAL_URL: process.env.JOB_ENGINE_LOCAL_URL,
    },
  });
}
