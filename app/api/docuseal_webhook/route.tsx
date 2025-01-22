import { JobStatus } from '@/components/Global/model';
import { logToCloudWatch } from '@/public/logger';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});

export async function POST(request: Request) {
    try {
      const payload = await request.json();

      let jobStatusEnum = JobStatus.PENDING_ESTIMATE;
      const jobStatus = payload.event_type.split('.')[1];
      logToCloudWatch(`Data for docuseal event: ${payload.data}`);
      logToCloudWatch(`Role from docusign: ${payload.data.role}`);

      await logToCloudWatch(`Handling new job status: ${jobStatus}`);
      switch (payload.event_type.split('.')[1]) {
        case 'viewed':
          jobStatusEnum = JobStatus.ESTIMATE_OPENED;
          break;
        case 'started':
          jobStatusEnum = JobStatus.ESTIMATE_OPENED;
          break;
        case 'completed':
          jobStatusEnum = JobStatus.ESTIMATE_ACCEPTED;
          break;
        case 'declined':
          jobStatusEnum = JobStatus.ESTIMATE_DECLINED;
          break;
        default:
          logToCloudWatch(`Unknown job status: ${jobStatus}`);
          jobStatusEnum = JobStatus.PENDING_ESTIMATE;
          break;
      }

      const updateItemCommand = new UpdateItemCommand({
        ExpressionAttributeValues: { ':status': { S: jobStatusEnum } },
        Key: { id: { S: payload.data.template.external_id } },
        ReturnValues: 'UPDATED_NEW',
        TableName: 'job',
        UpdateExpression: 'SET job_status = :status',
      });

      const { Attributes } = await client.send(updateItemCommand);

      logToCloudWatch(`Successfully processed webhook for job: ${payload.data.template.external_id}, status: ${jobStatusEnum}`);
      return Response.json({ message: `Webhook received successfully: ${Attributes}` }, { status: 200 });
    } catch (error: any) {
      logToCloudWatch(`Failed to process webhook: ${error.message}`);
      return Response.json({ error: `Failed to process webhook: ${error.message}` }, { status: 500 });
    }
  }
