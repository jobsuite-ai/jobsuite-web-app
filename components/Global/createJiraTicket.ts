import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import axios from 'axios';

import { logToCloudWatch } from '@/public/logger';

const client = new DynamoDBClient({});

export default async function createJiraTicket(
  projectKey: string,
  summary: string,
  description: string,
  jobID: string,
  issueType: string = 'Task',
) {
  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;
  const jiraEmail = process.env.JIRA_EMAIL;

  const url = `${jiraBaseUrl}/rest/api/3/issue`;
  const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64'); // Encode credentials

  const payload = {
    fields: {
      project: {
        key: projectKey,
      },
      summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: description,
              },
            ],
          },
        ],
      },
      issuetype: {
        name: issueType,
      },
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Basic ${auth}`, // Basic auth
        'Content-Type': 'application/json',
      },
    });

    await logToCloudWatch(`Ticket created successfully: ${response.data}`);
    const updateItemCommand = new UpdateItemCommand({
        ExpressionAttributeValues: { ':link': { S: response.data.self } },
        Key: { id: { S: jobID } },
        ReturnValues: 'UPDATED_NEW',
        TableName: 'job',
        UpdateExpression: 'SET jira_link = :link',
    });

    await client.send(updateItemCommand);

    await logToCloudWatch('Job updated with Jira link successfully');
    return response.data; // Return the response from Jira
  } catch (error: any) {
    logToCloudWatch(`Error creating Jira ticket: ${JSON.stringify(error.response?.data) || error.message}, stack: ${error.stack}`);
    throw error;
  }
}
