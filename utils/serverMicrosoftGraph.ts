import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

// Server-side Microsoft Graph client using client credentials flow
export async function getServerGraphClient() {
  // Use environment variables for sensitive credentials
  const clientId = process.env.OUTLOOK_CLIENT_ID!;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET!;
  const tenantId = process.env.OUTLOOK_TENANT_ID!;

  if (!tenantId || tenantId === 'organizations') {
    throw new Error('A specific tenant ID must be provided for client credentials flow');
  }

  // Create a credential using client ID and secret
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

  // Create an authentication provider using the credential
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  // Initialize the Graph client with the auth provider
  const client = Client.initWithMiddleware({
    authProvider,
  });

  return client;
}

// Function to create a calendar event (server-side)
export async function createCalendarEventServer({
  subject,
  startDateTime,
  endDateTime,
  attendees,
  location,
  body,
}: {
  subject: string;
  startDateTime: string;
  endDateTime: string;
  attendees: string[];
  location?: string;
  body?: string;
}) {
  try {
    const client = await getServerGraphClient();

    // The user ID or email of the calendar owner
    const userId = process.env.OUTLOOK_USER_ID || 'jonas@rlpeekpainting.com';

    const event = {
      subject,
      start: {
        dateTime: startDateTime,
        timeZone: 'Pacific Standard Time',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Pacific Standard Time',
      },
      location: location ? {
        displayName: location,
      } : undefined,
      body: body ? {
        contentType: 'HTML',
        content: body,
      } : undefined,
      attendees: attendees.map(email => ({
        emailAddress: {
          address: email,
        },
        type: 'required',
      })),
    };

    const result = await client
      .api(`/users/${userId}/calendar/events`)
      .post(event);

    return result;
  } catch (error) {
    console.error('Error creating calendar event on server:', error);
    throw error;
  }
}
