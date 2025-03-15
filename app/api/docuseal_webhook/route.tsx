import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import createJiraTicket from '@/components/Global/createJiraTicket';
import { JobStatus, SingleJob, DynamoClient } from '@/components/Global/model';
import { logToCloudWatch } from '@/public/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const jobID = payload.data.template.external_id;

    let jobStatusEnum = JobStatus.ESTIMATE_IN_PROGRESS;
    const jobStatus = payload.event_type.split('.')[1];

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
          jobStatusEnum = JobStatus.ESTIMATE_IN_PROGRESS;
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
          await getJobAndCreateTicket(job);

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

    if (job.job_status?.S !== JobStatus.RLPP_SIGNED &&
      job.job_status?.S !== JobStatus.JOB_COMPLETE) {
      const updateItemCommand = new UpdateItemCommand({
        ExpressionAttributeValues: {
          ':status': { S: jobStatusEnum },
          ':updated_at': { S: Date.now().toString() },
        },
        Key: { id: { S: payload.data.template.external_id } },
        ReturnValues: 'UPDATED_NEW',
        TableName: 'job',
        UpdateExpression: 'SET job_status = :status, updated_at = :updated_at',
      });
      const { Attributes } = await client.send(updateItemCommand);

      logToCloudWatch(`Successfully processed webhook for job: ${payload.data.template.external_id}, status: ${jobStatusEnum}`);
      return Response.json({ message: `Webhook received successfully: ${Attributes}` }, { status: 200 });
    }

    logToCloudWatch(`Successfully processed webhook for job: ${payload.data.template.external_id}, 
      but the job status was intentionally not updated: ${job.job_status?.S}`);
    return Response.json({ message: `Webhook received successfully, 
      but the job status was intentionally not updated.` }, { status: 200 });
  } catch (error: any) {
    logToCloudWatch(`Failed to process webhook: ${error.message}`);
    return Response.json({ error: `Failed to process webhook: ${error.message}` }, { status: 500 });
  }
}

async function getJobAndCreateTicket(job: SingleJob): Promise<any> {
  const jobID = job.id.S;

  try {
    if (jobID) {
      await logToCloudWatch(`Attempting to create a JIRA ticket for job: ${jobID}`);

      const getClientCommand = new GetItemCommand({
        TableName: process.env.CLIENT_TABLE_NAME,
        Key: {
          id: { S: job.client_id.S },
        },
      });
      const { Item: ClientItem } = await docClient.send(getClientCommand);
      const clientResponse = Response.json({ Item: ClientItem });
      const clientTemp = await clientResponse.json();
      const jobClient = clientTemp.Item as DynamoClient;

      await logToCloudWatch(`Successfully fetched job: ${jobID}, job: ${JSON.stringify(job)}`);
      const jiraTicket = await createJiraTicket(
        job,
        jobClient,
        'PAINTING',
        'Task'
      );

      await logToCloudWatch(`Successfully created JIRA ticket for job: ${jobID}, jira ticket: ${jiraTicket}`);
      return Response.json({ jiraTicket });
    }

    throw Error('Job id must be defined to create jira ticket');
  } catch (error: any) {
    await logToCloudWatch(`[JIRA_TICKET_CREATION_FAILED] Failed to create a JIRA ticket for job: ${jobID}, error: ${error.stack}`);
    return Response.json({ error: error.message });
  }
}
