import { NextResponse } from 'next/server';

import createJiraTicket from '@/components/Global/createJiraTicket';
import { DynamoClient, SingleJob } from '@/components/Global/model';
import { logToCloudWatch } from '@/public/logger';

export async function POST(request: Request) {
    try {
        await logToCloudWatch('Creating JIRA ticket from manual status change');
        const body = await request.json();
        const { job, client } = body;

        if (!job || !client) {
            return NextResponse.json({ error: 'Job and client data are required' }, { status: 400 });
        }

        const jiraTicketUrl = await createJiraTicket(job as SingleJob, client as DynamoClient);
        return NextResponse.json({ jiraTicketUrl });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to create JIRA ticket' },
            { status: 500 }
        );
    }
}
