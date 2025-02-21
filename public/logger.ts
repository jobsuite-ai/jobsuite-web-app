import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';

const REGION = process.env.AWS_REGION || 'us-east-1';

const client = new CloudWatchLogsClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

let sequenceToken: string | undefined;

export async function logToCloudWatch(message: string, log_stream = process.env.LOG_STREAM_NAME) {
  try {
    // Create log stream if it doesn't exist
    await client.send(
      new CreateLogStreamCommand({
        logGroupName: process.env.LOG_GROUP_NAME,
        logStreamName: log_stream,
      })
    );
  } catch (err: any) {
    if (err.name !== 'ResourceAlreadyExistsException') {
      return;
    }
  }

  try {
    // Send log message
    const response = await client.send(
      new PutLogEventsCommand({
        logGroupName: process.env.LOG_GROUP_NAME,
        logStreamName: log_stream,
        logEvents: [
          {
            message,
            timestamp: Date.now(),
          },
        ],
        sequenceToken,
      })
    );
    sequenceToken = response.nextSequenceToken;
  } catch (err) {
    // Error logging to cloudwatch
  }
}
