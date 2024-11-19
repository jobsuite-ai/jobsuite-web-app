import {
    DeleteItemCommand,
    DynamoDBClient,
    GetItemCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: Request) {
    try {
        const {
            jobID,
            client_name,
            client_address,
            client_email,
            job_date,
            video,
        } = await request.json();

        const command = new PutCommand({
            TableName: process.env.JOB_TABLE_NAME,
            Item: {
                id: jobID,
                client_name,
                client_address,
                client_email,
                job_date,
                video,
            },
          });

        const data = await docClient.send(command);
        return Response.json({ data });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

export async function GET(request: Request) {
    // const { jobID, content } = await request.json();
    const { jobID } = await request.json();

    try {
        const getItemCommand = new GetItemCommand({
            TableName: process.env.JOB_TABLE_NAME,
            Key: {
                id: { S: jobID },
            },
        });
        const { Item } = await client.send(getItemCommand);

        return Response.json({ Item });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

export async function PUT(request: Request) {
    const { jobID, content } = await request.json();

    try {
        const updateItemCommand = new UpdateItemCommand({
            TableName: process.env.JOB_TABLE_NAME,
            Key: {
                id: { S: jobID },
            },
            UpdateExpression: 'set content = :c',
            ExpressionAttributeValues: {
                ':c': { S: content },
            },
            ReturnValues: 'ALL_NEW',
        });
        const { Attributes } = await client.send(updateItemCommand);

        return Response.json({ Attributes });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

export async function DELETE(request: Request) {
    const { jobID } = await request.json();

    try {
        const deleteCommand = new DeleteItemCommand({
            TableName: process.env.JOB_TABLE_NAME,
            Key: {
                id: { S: jobID },
            },
        });

        const { Attributes } = await client.send(deleteCommand);

        return Response.json({ Attributes });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
