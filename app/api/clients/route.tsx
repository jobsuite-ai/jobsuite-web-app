import {
    DynamoDBClient,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: Request) {
    try {
        const {
            id,
            jobs,
            name,
            address,
            city,
            state,
            zip_code,
            email,
            phone_number,
            timestamp,
        } = await request.json();

        const command = new PutCommand({
            TableName: 'client',
            Item: {
                user_id: process.env.RLPP_USER_ID,
                id,
                jobs,
                name,
                address,
                city,
                state,
                zip_code,
                email,
                phone_number,
                timestamp,
            },
        });

        const data = await docClient.send(command);
        return Response.json({ data });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

export async function GET() {
    try {
        const params = {
            TableName: 'client',
            IndexName: 'user_id-timestamp-index',
            KeyConditionExpression: 'user_id = :pk',
            ExpressionAttributeValues: {
                ':pk': '8de087f0-f33e-4e38-90ad-319d7edf7f27',
            },
            ScanIndexForward: false,
        };

        const { Items } = await docClient.send(new QueryCommand(params));

        return Response.json({ Items });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

export async function PUT(request: Request) {
    const { clientID, content } = await request.json();

    if (content.job) {
        try {
            const updateItemCommand = new UpdateItemCommand({
                ExpressionAttributeValues: {
                    ':new_job': {
                        L: [{ S: content.job.jobID }],
                    },
                    ':empty_list': {
                        L: [],
                    },
                    ':timestamp': {N: content.timestamp.toString()},
                },
                Key: { id: { S: clientID } },
                ReturnValues: 'UPDATED_NEW',
                TableName: 'client',
                UpdateExpression: 'SET jobs = list_append(if_not_exists(jobs, :empty_list), :new_job), timestamp = :timestamp',
            });
            const { Attributes } = await client.send(updateItemCommand);

            return Response.json({ Attributes });
        } catch (error: any) {
            return Response.json({ error: error.message });
        }
    }

    return Response.json({ error: 'Not handled yet' });
}
