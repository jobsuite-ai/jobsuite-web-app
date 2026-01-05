import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

const axios = require('axios').default;

const client = new DynamoDBClient({});

export async function POST(request: Request) {
    try {
        const { template_id, jobID, client_email, client_emails } = await request.json();

        // Get contractor_id from request
        const contractorId = await getContractorId(request);
        if (!contractorId) {
            return Response.json({ error: 'Contractor ID not found' }, { status: 401 });
        }

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

        return axios.request(options).then(async (response: any) => {
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

            // Generate signature links for each email
            const signatureLinks: string[] = [];
            const apiBaseUrl = getApiBaseUrl();
            const authHeader = request.headers.get('Authorization');

            if (authHeader) {
                try {
                    // Generate signature link for each email
                    for (const email of emails) {
                        const signatureResponse = await fetch(
                            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${jobID}/signature-links`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: authHeader,
                                },
                                body: JSON.stringify({
                                    client_email: email,
                                    expires_in_days: 30,
                                }),
                            }
                        );

                        if (signatureResponse.ok) {
                            const signatureData = await signatureResponse.json();
                            signatureLinks.push(signatureData.signature_url);
                        }
                    }
                } catch (error) {
                    // Log error but don't fail the request
                    console.error('Error generating signature links:', error);
                }
            }

            return Response.json({
                output,
                signature_links: signatureLinks,
            });
        }).catch((error: any) => Response.json({ error: error.message }));
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
