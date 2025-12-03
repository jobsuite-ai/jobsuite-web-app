import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const axios = require('axios').default;

const client = new DynamoDBClient({});

export async function POST(request: Request) {
    try {
        const { template_id, jobID, client_email } = await request.json();

        const options = {
            method: 'POST',
            url: 'https://api.docuseal.com/submissions',
            headers: { 'X-Auth-Token': process.env.DOCUSEAL_KEY, 'content-type': 'application/json' },
            data: {
                template_id,
                send_email: true,
                submitters: [
                    { role: 'Property Owner', email: client_email },
                    { role: 'Service Provider', email: process.env.COMPANY_EMAIL },
                ],
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
