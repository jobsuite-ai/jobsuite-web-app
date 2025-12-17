import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import { NextRequest, NextResponse } from 'next/server';

const REGION = process.env.AWS_REGION || 'us-east-1';

// Store sequence token per log stream
const sequenceTokens: Record<string, string | undefined> = {};

/**
 * Get CloudWatch client with credentials from Amplify secrets
 * Amplify automatically injects secrets as environment variables at runtime
 */
function getCloudWatchClient(): CloudWatchLogsClient {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS credentials not found. ' +
      'Please ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY ' +
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, logStream } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const logGroupName = process.env.LOG_GROUP_NAME;
    const logStreamName = logStream || process.env.LOG_STREAM_NAME;

    if (!logGroupName || !logStreamName) {
      return NextResponse.json(
        { error: 'LOG_GROUP_NAME and LOG_STREAM_NAME must be configured' },
        { status: 500 },
      );
    }

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
