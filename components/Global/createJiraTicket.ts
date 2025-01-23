import { logToCloudWatch } from '@/public/logger';
import axios from 'axios';

export default async function createJiraTicket(
  projectKey: string,
  summary: string,
  description: string,
  issueType: string = 'Task' // Default to 'Task', can be 'Bug', 'Story', etc.
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
      summary: summary,
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

    console.log('Ticket created successfully:', response.data);
    return response.data; // Return the response from Jira
  } catch (error: any) {
    logToCloudWatch(`Error creating Jira ticket: ${JSON.stringify(error.response?.data) || error.message}, stack: ${error.stack}`);
    throw error;
  }
}
