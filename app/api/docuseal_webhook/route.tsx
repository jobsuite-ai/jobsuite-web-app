import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { JobStatus, SingleJob } from '@/components/Global/model';
import { logToCloudWatch } from '@/public/logger';
import createJiraTicket from '@/components/Global/createJiraTicket';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    let jobStatusEnum = JobStatus.PENDING_ESTIMATE;
    const jobStatus = payload.event_type.split('.')[1];



    await logToCloudWatch(`Handling new job status: ${jobStatus}`);
    if (payload.data.role === 'Property Owner') {
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
    } else {
      switch (payload.event_type.split('.')[1]) {
        case 'viewed':
          jobStatusEnum = JobStatus.RLPP_OPENED;
          break;
        case 'started':
          jobStatusEnum = JobStatus.RLPP_OPENED;
          break;
        case 'completed':
          await getJobAndCreateTicket(payload);

          jobStatusEnum = JobStatus.RLPP_SIGNED;
          break;
        case 'declined':
          jobStatusEnum = JobStatus.RLPP_DECLINED;
          break;
        default:
          logToCloudWatch(`Unknown job status: ${jobStatus}`);
          jobStatusEnum = JobStatus.RLPP_OPENED;
          break;
      }
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

async function getJobAndCreateTicket(payload: any) {
  try {
    if (payload.data.template.external_id) {
      const getItemCommand = new GetItemCommand({
        TableName: process.env.JOB_TABLE_NAME,
        Key: {
          id: { S: payload.data.template.external_id },
        },
      });
      const { Item } = await docClient.send(getItemCommand);

      const job = Item as SingleJob;

      await createJiraTicket(
        'PAINT',
        `${job.client_name.S} bid on ${job.estimate_date.S.split('T')[0]}`,
        job.description.S,
        'Task'
      );
    }

    throw Error('JobID must be defined to get a job');
  } catch (error: any) {
    return Response.json({ error: error.message });
  }
}
