import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { NextResponse } from 'next/server';

import { createCalendarEventServer } from '@/utils/serverMicrosoftGraph';

const client = new DynamoDBClient({});

export async function POST(request: Request) {
  try {
    const {
      subject,
      startDateTime,
      endDateTime,
      attendees,
      location,
      body,
      jobId,
    } = await request.json();

    // Validate required fields
    if (!subject || !startDateTime || !endDateTime || !attendees || !jobId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the calendar event using server-side implementation
    const event = await createCalendarEventServer({
      subject,
      startDateTime,
      endDateTime,
      attendees,
      location,
      body,
    });

    // Extract the event ID and web link
    const eventId = event.id;
    const eventUrl = event.webLink;

    // Update the job in your database
    const updateItemCommand = new UpdateItemCommand({
        ExpressionAttributeValues: {
          ':outlook_event_id': { S: eventId },
          ':outlook_event_url': { S: eventUrl },
          ':estimate_date': { S: startDateTime },
        },
        Key: { id: { S: jobId } },
        ReturnValues: 'UPDATED_NEW',
        TableName: 'job',
        UpdateExpression: `SET outlook_event_id = :outlook_event_id,
          outlook_event_url = :outlook_event_url,
          estimate_date = :estimate_date
        `,
    });
    await client.send(updateItemCommand);

    return NextResponse.json({
      success: true,
      event: {
        id: eventId,
        url: eventUrl,
        subject,
        startDateTime,
        endDateTime,
      },
    });
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: `Failed to create calendar event: ${error.message}` },
      { status: 500 }
    );
  }
}
