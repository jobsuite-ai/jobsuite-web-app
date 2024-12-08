import {
    DeleteItemCommand,
    DynamoDBClient,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { PutCommand, DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { JobStatus } from '@/components/Global/model';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: Request) {
    try {
        const {
            jobID,
            client_id,
            client_name,
            client_address,
            city,
            state,
            zip_code,
            client_email,
            estimate_date,
            client_phone_number,
            video,
        } = await request.json();

        const command = new PutCommand({
            TableName: process.env.JOB_TABLE_NAME,
            Item: {
                user_id: process.env.RLPP_USER_ID,
                id: jobID,
                job_status: JobStatus.PENDING_ESTIMATE,
                client_id,
                client_name,
                client_address,
                city,
                state,
                zip_code,
                client_email,
                estimate_date,
                client_phone_number,
                video,
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
            TableName: 'job',
            IndexName: 'user_id-estimate_date-index',
            KeyConditionExpression: 'user_id = :pk',
            ExpressionAttributeValues: {
                ':pk': '8de087f0-f33e-4e38-90ad-319d7edf7f27',
            },
            ScanIndexForward: true,
        };

        const { Items } = await docClient.send(new QueryCommand(params));

        return Response.json({ Items });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

export async function PUT(request: Request) {
    const { jobID, content } = await request.json();

    if (content.video) {
        try {
            const updateItemCommand = new UpdateItemCommand({
                ExpressionAttributeValues: {
                    ':v': {
                        M: {
                            name: { S: content.video.name.toString() },
                            size: { N: content.video.size.toString() },
                            lastModified: { N: content.video.lastModified.toString() },
                        },
                    },
                },
                Key: { id: { S: jobID } },
                ReturnValues: 'UPDATED_NEW',
                TableName: 'job',
                UpdateExpression: 'SET video = :v',
            });
            const { Attributes } = await client.send(updateItemCommand);

            return Response.json({ Attributes });
        } catch (error: any) {
            return Response.json({ error: error.message });
        }
    }

    if (content.images) {
        try {
            const imageObject = new Array<any>();
            content.images.forEach((image: any) => {
                imageObject.push({
                    M: {
                        name: { S: image.name.toString() },
                        size: { N: image.size.toString() },
                        lastModified: { N: image.lastModified.toString() },
                    },
                });
            });

            const updateItemCommand = new UpdateItemCommand({
                ExpressionAttributeValues: {
                    ':i': {
                        L: imageObject,
                    },
                },
                Key: { id: { S: jobID } },
                ReturnValues: 'UPDATED_NEW',
                TableName: 'job',
                UpdateExpression: 'SET images = :i',
            });
            const { Attributes } = await client.send(updateItemCommand);

            return Response.json({ Attributes });
        } catch (error: any) {
            return Response.json({ error: error.message });
        }
    }

    if (content.line_item) {
        try {
            const lineItem = {
                M: {
                        header: { S: content.line_item.header },
                        description: { S: content.line_item.description },
                        price: { N: content.line_item.price.toString() },
                },
            };

            const updateItemCommand = new UpdateItemCommand({
                ExpressionAttributeValues: {
                    ':new_line_items': {
                        L: [lineItem],
                    },
                    ':empty_list': {
                        L: [],
                    },
                },
                Key: { id: { S: jobID } },
                ReturnValues: 'UPDATED_NEW',
                TableName: 'job',
                UpdateExpression: 'SET line_items = list_append(if_not_exists(line_items, :empty_list), :new_line_items)',
            });

            const { Attributes } = await client.send(updateItemCommand);

            return Response.json({ Attributes });
        } catch (error: any) {
            return Response.json({ error: error.message });
        }
    }

    if (content.job_status) {
        try {
            const updateItemCommand = new UpdateItemCommand({
                ExpressionAttributeValues: {':status': {S: content.job_status}},
                Key: { id: { S: jobID } },
                ReturnValues: 'UPDATED_NEW',
                TableName: 'job',
                UpdateExpression: 'SET job_status = :status',
            });
            const { Attributes } = await client.send(updateItemCommand);

            return Response.json({ Attributes });
        } catch (error: any) {
            return Response.json({ error: error.message });
        }
    }

    return Response.json({ error: 'Not handled yet' });
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
