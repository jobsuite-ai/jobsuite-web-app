import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const REGION = process.env.APP_AWS_REGION || 'us-east-1';

function getDateStamp() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDailyLogStreamName(baseStreamName: string) {
  return `${baseStreamName}-${getDateStamp()}`;
}

// Store sequence token per log stream
const sequenceTokens: Record<string, string | undefined> = {};

/**
 * Get CloudWatch client with credentials from Amplify secrets
 * Amplify automatically injects secrets as environment variables at runtime
 */
function getCloudWatchClient(): CloudWatchLogsClient {
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS credentials not found. ' +
      'Please ensure APP_AWS_ACCESS_KEY_ID and APP_AWS_SECRET_ACCESS_KEY ' +
      'are configured as Amplify secrets.',
    );
  }

  return new CloudWatchLogsClient({
    region: REGION,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function isResolverString(value?: string) {
  return Boolean(value && value.includes('{{resolve:secretsmanager:'));
}

export async function GET() {
  const appAccessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const appSecretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
  const logGroupName = process.env.LOG_GROUP_NAME;
  const logStreamName = process.env.LOG_STREAM_NAME;

  return NextResponse.json({
    appAccessKeyIdSet: Boolean(appAccessKeyId),
    appSecretAccessKeySet: Boolean(appSecretAccessKey),
    appAccessKeyIdLooksResolved:
      Boolean(appAccessKeyId) && !isResolverString(appAccessKeyId),
    appSecretAccessKeyLooksResolved:
      Boolean(appSecretAccessKey) && !isResolverString(appSecretAccessKey),
    logGroupNameSet: Boolean(logGroupName),
    logStreamNameSet: Boolean(logStreamName),
    region: REGION,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, logStream } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const logGroupName = process.env.LOG_GROUP_NAME;
    const baseStreamName = logStream || process.env.LOG_STREAM_NAME;

    if (!logGroupName || !baseStreamName) {
      return NextResponse.json(
        { error: 'LOG_GROUP_NAME and LOG_STREAM_NAME must be configured' },
        { status: 500 },
      );
    }
    const logStreamName = getDailyLogStreamName(baseStreamName);

    // Get CloudWatch client with credentials from Amplify secrets
    const client = getCloudWatchClient();

    // Create log stream if it doesn't exist
    try {
      await client.send(
        new CreateLogStreamCommand({
          logGroupName,
          logStreamName,
        }),
      );
    } catch (err: any) {
      // Ignore ResourceAlreadyExistsException
      if (err.name !== 'ResourceAlreadyExistsException') {
        // eslint-disable-next-line no-console
        console.error('Error creating log stream:', err);
        return NextResponse.json({ error: 'Failed to create log stream' }, { status: 500 });
      }
    }

    // Send log message
    try {
      const response = await client.send(
        new PutLogEventsCommand({
          logGroupName,
          logStreamName,
          logEvents: [
            {
              message,
              timestamp: Date.now(),
            },
          ],
          sequenceToken: sequenceTokens[logStreamName],
        }),
      );

      // Store sequence token for next call
      if (response.nextSequenceToken) {
        sequenceTokens[logStreamName] = response.nextSequenceToken;
      }

      return NextResponse.json({ success: true });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Error logging to CloudWatch:', err);
      return NextResponse.json({ error: 'Failed to log to CloudWatch' }, { status: 500 });
    }
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error processing log request:', error);
    return NextResponse.json(
      { error: error.message || 'Invalid request' },
      { status: error.message?.includes('credentials') ? 500 : 400 },
    );
  }
}
