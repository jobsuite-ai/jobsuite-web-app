import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import axios from 'axios';

import { SingleJob, DynamoClient } from './model';

import { logToCloudWatch } from '@/public/logger';
import { MarkdownToADFConverter } from '@/public/MarkdownToAdfConverter';

const client = new DynamoDBClient({});

export default async function createJiraTicket(
  job: SingleJob,
  jobClient: DynamoClient,
  projectKey: string,
  issueType: string = 'Task',
) {
  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;
  const jiraEmail = process.env.JIRA_EMAIL;

  const key = `${job.id?.S}/${job.video?.M?.name?.S}`;
  const baseCloudFrontURL = 'https://rl-peek-job-videos.s3.us-west-2.amazonaws.com/';

  const summary = `${job.client_name?.S} bid on ${job.estimate_date?.S.split('T')[0]}`;
  const description = `${job.transcription_summary?.S}\n
## Spanish Details\n${job.spanish_transcription?.S}\n
## Paint Can Image\n
## Color Usage Details\n
`;

  const videoLink = baseCloudFrontURL + key;
  const jobLink = `https://admin.rlpeekpainting.com/jobs/${job.id?.S}`;

  const converter = new MarkdownToADFConverter(description);
  const adfDescription = converter.convert().content;

  const finalDescription = [
    {
      type: 'heading',
      attrs: {
        level: 2,
      },
      content: [
        {
          type: 'text',
          text: 'Job Link',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '',
        },
        {
          type: 'text',
          text: 'Job Link',
          marks: [
            {
              type: 'link',
              attrs: {
                href: jobLink,
                title: 'Job Link',
              },
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      attrs: {
        level: 2,
      },
      content: [
        {
          type: 'text',
          text: 'Job Video',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'You can download the video at this link, or go to the job link and watch it there.\n',
        },
        {
          type: 'inlineCard',
          attrs: {
            url: videoLink,
          },
        },
      ],
    }, ...adfDescription];

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
        content: finalDescription,
      },
      issuetype: {
        name: issueType,
      },
      customfield_10132: parseFloat(job.estimate_hours?.N),
      customfield_10165: 0,
      customfield_10166: parseFloat(job.estimate_hours?.N),
      customfield_10198: jobClient.phone_number?.S,
      customfield_10199: jobClient.email?.S,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    await logToCloudWatch(`Ticket created successfully: ${response.data}`);
    const jiraTicketUrl = `${jiraBaseUrl}/browse/${response.data.key}`;
    const updateItemCommand = new UpdateItemCommand({
        ExpressionAttributeValues: { ':link': { S: jiraTicketUrl } },
        Key: { id: { S: job.id?.S } },
        ReturnValues: 'UPDATED_NEW',
        TableName: 'job',
        UpdateExpression: 'SET jira_link = :link',
    });

    await client.send(updateItemCommand);

    await logToCloudWatch('Job updated with Jira link successfully');

    return jiraTicketUrl;
  } catch (error: any) {
    logToCloudWatch(`Error creating Jira ticket: ${JSON.stringify(error.response?.data) || error.message}, stack: ${error.stack}`);
    throw error;
  }
}
