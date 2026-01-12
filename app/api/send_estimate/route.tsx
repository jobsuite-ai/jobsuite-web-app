import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(request: Request) {
    try {
        const { jobID, client_email, client_emails } = await request.json();

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

        // Generate signature links for each email
        const signatureLinks: string[] = [];
        const apiBaseUrl = getApiBaseUrl();
        const authHeader = request.headers.get('Authorization');

        if (!authHeader) {
            return Response.json({ error: 'Authorization header required' }, { status: 401 });
        }

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
                } else {
                    const errorData = await signatureResponse.json().catch(() => ({}));
                    // eslint-disable-next-line no-console
                    console.error(`Failed to generate signature link for ${email}:`, errorData);
                }
            }

            if (signatureLinks.length === 0) {
                return Response.json(
                    { error: 'Failed to generate signature links for any recipients' },
                    { status: 500 }
                );
            }

            // Send emails with signature links
            const sendEmailResponse = await fetch(
                `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${jobID}/send-email`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: authHeader,
                    },
                    body: JSON.stringify({
                        client_emails: emails,
                        signature_urls: signatureLinks,
                    }),
                }
            );

            if (!sendEmailResponse.ok) {
                const errorData = await sendEmailResponse.json().catch(() => ({}));
                return Response.json(
                    { error: errorData.detail || 'Failed to send estimate emails' },
                    { status: sendEmailResponse.status }
                );
            }

            const emailResults = await sendEmailResponse.json();

            return Response.json({
                success: true,
                signature_links: signatureLinks,
                email_results: emailResults.results,
            });
        } catch (error: any) {
            // eslint-disable-next-line no-console
            console.error('Error sending estimate:', error);
            return Response.json({ error: error.message || 'Failed to send estimate' }, { status: 500 });
        }
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
