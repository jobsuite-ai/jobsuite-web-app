import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { getServiceAccountToken } from '../utils/serviceAuth';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';
import createJiraTicket from '@/components/Global/createJiraTicket';
import { DynamoClient, Estimate, EstimateStatus, SingleJob } from '@/components/Global/model';
import { logToCloudWatch } from '@/public/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const estimateID = payload.data.template.external_id;

    let jobStatusEnum = EstimateStatus.ESTIMATE_IN_PROGRESS;
    const jobStatus = payload.event_type.split('.')[1];

    // First, get contractor_id from DynamoDB to use for API calls
    const getItemCommand = new GetItemCommand({
      TableName: process.env.JOB_TABLE_NAME,
      Key: {
        id: { S: estimateID },
      },
    });
    const { Item } = await docClient.send(getItemCommand);
    if (!Item) {
      await logToCloudWatch(`Estimate not found in DynamoDB: ${estimateID}`);
      return Response.json({ error: 'Estimate not found' }, { status: 404 });
    }

    // Extract contractor_id from DynamoDB item
    const contractorId = Item.contractor_id?.S;
    if (!contractorId) {
      await logToCloudWatch(`Contractor ID not found for estimate: ${estimateID}`);
      return Response.json({ error: 'Contractor ID not found' }, { status: 400 });
    }

    // Get estimate from job engine API
    const apiBaseUrl = getApiBaseUrl();

    // Get service account token for authentication
    let accessToken: string;
    try {
      accessToken = await getServiceAccountToken();
    } catch (error: any) {
      await logToCloudWatch(`Failed to get service account token: ${error.message}`);
      return Response.json(
        { error: 'Authentication failed. Please check service account configuration.' },
        { status: 500 }
      );
    }

    const estimateResponse = await fetch(
      `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimateID}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!estimateResponse.ok) {
      const errorData = await estimateResponse.json().catch(() => ({ detail: 'Failed to fetch estimate' }));
      await logToCloudWatch(`Failed to fetch estimate from API: ${errorData.detail}`);
      return Response.json({ error: errorData.detail || 'Failed to fetch estimate' }, { status: estimateResponse.status });
    }

    const estimate = await estimateResponse.json() as Estimate;

    // Convert DynamoDB Item to SingleJob format for JIRA ticket creation
    const job = Item as unknown as SingleJob;

    await logToCloudWatch(`Handling new job status: ${jobStatus}`);
    if (payload.data.role === 'Property Owner') {
      switch (jobStatus) {
        case 'viewed':
          jobStatusEnum = EstimateStatus.ESTIMATE_OPENED;
          break;
        case 'started':
          jobStatusEnum = EstimateStatus.ESTIMATE_OPENED;
          break;
        case 'completed':
          jobStatusEnum = EstimateStatus.ESTIMATE_ACCEPTED;
          break;
        case 'declined':
          jobStatusEnum = EstimateStatus.ESTIMATE_DECLINED;
          break;
        default:
          logToCloudWatch(`Unknown job status: ${jobStatus}`);
          jobStatusEnum = EstimateStatus.ESTIMATE_IN_PROGRESS;
          break;
      }
    } else {
      switch (jobStatus) {
        case 'viewed':
          jobStatusEnum = EstimateStatus.CONTRACTOR_OPENED;
          break;
        case 'started':
          jobStatusEnum = EstimateStatus.CONTRACTOR_OPENED;
          break;
        case 'completed':
          jobStatusEnum = EstimateStatus.CONTRACTOR_SIGNED;
          await getJobAndCreateTicket(job);

          break;
        case 'declined':
          jobStatusEnum = EstimateStatus.CONTRACTOR_DECLINED;
          break;
        default:
          logToCloudWatch(`Unknown job status: ${jobStatus}`);
          jobStatusEnum = EstimateStatus.CONTRACTOR_OPENED;
          break;
      }
    }

    if (estimate.status !== EstimateStatus.CONTRACTOR_SIGNED &&
      estimate.status !== EstimateStatus.ACCOUNTING_NEEDED) {
      // Update estimate via job engine API
      // Reuse the same token (it's cached, so this is efficient)
      const updateResponse = await fetch(
        `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimateID}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status: jobStatusEnum }),
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({ detail: 'Failed to update estimate' }));
        await logToCloudWatch(`Failed to update estimate via API: ${errorData.detail}`);
        return Response.json({ error: errorData.detail || 'Failed to update estimate' }, { status: updateResponse.status });
      }

      const updatedEstimate = await updateResponse.json();
      logToCloudWatch(`Successfully processed webhook for estimate: ${estimateID}, status: ${jobStatusEnum}`);
      return Response.json({ message: 'Webhook received successfully', estimate: updatedEstimate }, { status: 200 });
    }

    logToCloudWatch(`Successfully processed webhook for estimate: ${estimateID}, 
      but the estimate status was intentionally not updated: ${estimate.status}`);
    return Response.json({ message: `Webhook received successfully, 
      but the estimate status was intentionally not updated.` }, { status: 200 });
  } catch (error: any) {
    logToCloudWatch(`Failed to process webhook: ${error.message}`);
    return Response.json({ error: `Failed to process webhook: ${error.message}` }, { status: 500 });
  }
}

async function getJobAndCreateTicket(job: SingleJob): Promise<any> {
  const jobID = job.id?.S;

  try {
    if (jobID) {
      await logToCloudWatch(`Attempting to create a JIRA ticket for job: ${jobID}`);

      const getClientCommand = new GetItemCommand({
        TableName: process.env.CLIENT_TABLE_NAME,
        Key: {
          id: { S: job.client_id?.S },
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
