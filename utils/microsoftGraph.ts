import * as msal from '@azure/msal-browser';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthCodeMSALBrowserAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser';

import { getMsalInstance } from './microsoftAuth';

// Authentication provider that uses MSAL
export async function getGraphClient() {
  const msalInstance = await getMsalInstance();
  if (!msalInstance) {
    throw new Error('MSAL instance not initialized');
  }

  // Get all accounts
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('No accounts found. User must sign in first.');
  }

  // Create an authentication provider for the client
  const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(msalInstance, {
    account: accounts[0],
    scopes: ['https://graph.microsoft.com/Calendars.ReadWrite'],
    interactionType: msal.InteractionType.Popup,
  });

  // Initialize the Graph client
  const graphClient = Client.initWithMiddleware({
    authProvider,
  });

  return graphClient;
}

// Function to create a calendar event
export async function createCalendarEvent({
  subject,
  startDateTime,
  endDateTime,
  attendees,
  location,
  body,
  jobId,
}: {
  subject: string;
  startDateTime: string;
  endDateTime: string;
  attendees: string[];
  location?: string;
  body?: string;
  jobId: string;
}) {
  try {
    const client = await getGraphClient();

    // The user ID or email of the calendar owner
    // For application permissions, you need to specify the user
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
      // Store the job ID in the event for reference
      extensions: [
        {
          extensionName: 'jobReference',
          id: jobId,
        },
      ],
    };

    const result = await client
      .api(`/users/${userId}/calendar/events`)
      .post(event);

    return result;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

// Function to get a calendar event by ID
export async function getCalendarEvent(eventId: string) {
  try {
    const client = await getGraphClient();
    const userId = process.env.OUTLOOK_USER_ID || 'jonas@rlpeekpainting.com';

    const event = await client
      .api(`/users/${userId}/calendar/events/${eventId}`)
      .get();

    return event;
  } catch (error) {
    console.error('Error getting calendar event:', error);
    throw error;
  }
}

// Function to update a job with calendar event details
export async function updateJobWithCalendarEvent(jobId: string, eventId: string, eventUrl: string) {
  // This would typically call your API to update the job in your database
  const response = await fetch('/api/jobs/update-calendar-event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jobId,
      eventId,
      eventUrl,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update job with calendar event');
  }

  return response.json();
}
