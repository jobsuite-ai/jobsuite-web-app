import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import createJiraTicket from '@/components/Global/createJiraTicket';
import { JobStatus, SingleJob } from '@/components/Global/model';
import { logToCloudWatch } from '@/public/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    let jobStatusEnum = JobStatus.PENDING_ESTIMATE;
    const jobStatus = payload.event_type.split('.')[1];

    await logToCloudWatch(`Handling new job status: ${jobStatus}`);
    if (payload.data.role === 'Property Owner') {
      switch (jobStatus) {
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
      switch (jobStatus) {
        case 'viewed':
          jobStatusEnum = JobStatus.RLPP_OPENED;
          break;
        case 'started':
          jobStatusEnum = JobStatus.RLPP_OPENED;
          break;
        case 'completed':
          jobStatusEnum = JobStatus.RLPP_SIGNED;
          await getJobAndCreateTicket(payload);

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

async function getJobAndCreateTicket(payload: any): Promise<any> {
  const jobID = payload.data.template.external_id;

  try {
    if (!jobID) {
      throw Error('Job id must be defined to create jira ticket');
    }
    await logToCloudWatch(`Attempting to create a JIRA ticket for job: ${jobID}`);

    if (jobID) {
      const getItemCommand = new GetItemCommand({
        TableName: process.env.JOB_TABLE_NAME,
        Key: {
          id: { S: jobID },
        },
      });
      const { Item } = await docClient.send(getItemCommand);
      const response = Response.json({ Item });
      const jobTemp = await response.json();
      const job = jobTemp.Item as SingleJob;

      await logToCloudWatch(`Successfully fetched job: ${jobID}, job: ${JSON.stringify(job)}`);
      await createJiraTicket(
        job,
        'PAINTING',
        'Task'
      );
    }

    throw Error('JobID must be defined to get a job');
  } catch (error: any) {
    await logToCloudWatch(`Failed to create a JIRA ticket for job: ${jobID}, error: ${error.stack}`);
    return Response.json({ error: error.message });
  }
}
