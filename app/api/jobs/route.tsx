import {
    DeleteItemCommand,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    UpdateItemCommand
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
            video
        } = await request.json()

        const command = new PutCommand({
            TableName: process.env.JOB_TABLE_NAME,
            Item: {
                id: jobID,
                client_name: client_name,
                client_address: client_address,
                client_email: client_email,
                job_date: job_date,
                video: video
            },
          });

        const data = await docClient.send(command);
        console.log('result : ' + JSON.stringify(data));
        return Response.json({ data })
    } catch (error: any) {
        return Response.json({ error: error.message })
    }
}

export async function GET(request: Request) {
    const { jobID, content } = await request.json()

    try {
        const { Item } = await client.send(
            new GetItemCommand({
                TableName: process.env.JOB_TABLE_NAME,
                Key: {
                    id: {S: jobID}
                }
            })
        );

        return Response.json({ Item })
    } catch (error: any) {
        return Response.json({ error: error.message })
    }
}

export async function PUT(request: Request) {
    const { jobID, content } = await request.json()

    try {
        const { Attributes } = await client.send(
            new UpdateItemCommand({
                TableName: process.env.JOB_TABLE_NAME,
                Key: {
                    id: { S: jobID }
                },
                UpdateExpression: 'set content = :c',
                ExpressionAttributeValues: {
                    ':c': { S: content }
                },
                ReturnValues: 'ALL_NEW'
            })
        );

        return Response.json({ Attributes })
    } catch (error: any) {
        return Response.json({ error: error.message })
    }
}

export async function DELETE(request: Request) {
    const { jobID } = await request.json()

    try {
        new DeleteItemCommand({
            TableName: process.env.JOB_TABLE_NAME,
            Key: {
                id: { S: jobID }
            }
        })

        return Response.json({})
    } catch (error: any) {
        return Response.json({ error: error.message })
    }
}
