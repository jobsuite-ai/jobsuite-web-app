import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const axios = require('axios').default;

const client = new DynamoDBClient({});

export async function POST(request: Request) {
    try {
        const { template_id, jobID, client_email, client_emails } = await request.json();

        // Support both single email (backward compatibility) and multiple emails
        const emails = client_emails &&
          Array.isArray(client_emails) ? client_emails : (client_email ? [client_email] : []);

        if (emails.length === 0) {
            return Response.json({ error: 'No email addresses provided' }, { status: 400 });
        }

        // Build submitters array - one for each email, plus the service provider
        const submitters = emails.map((email: string) => ({
            role: 'Property Owner',
            email,
        }));

        // Add service provider email
        submitters.push({
            role: 'Service Provider',
            email: process.env.COMPANY_EMAIL || '',
        });

        const options = {
            method: 'POST',
            url: 'https://api.docuseal.com/submissions',
            headers: { 'X-Auth-Token': process.env.DOCUSEAL_KEY, 'content-type': 'application/json' },
            data: {
                template_id,
                send_email: true,
                submitters,
                reply_to: 'brandon@rlpeekpainting.com',
            },
        };

        return axios.request(options).then((response: any) => {
            const output = response.data;
            const docusealLink = `https://docuseal.com/submissions/${output[0].submission_id}`;

            const updateItemCommand = new UpdateItemCommand({
                ExpressionAttributeValues: { ':link': { S: docusealLink } },
                Key: { id: { S: jobID } },
                ReturnValues: 'UPDATED_NEW',
                TableName: 'job',
                UpdateExpression: 'SET docuseal_link = :link',
            });

            client.send(updateItemCommand);

            return Response.json({ output });
        }).catch((error: any) => Response.json({ error: error.message }));
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
