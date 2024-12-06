import {
    DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function GET(req: Request, { params }: { params: any }) {
    await params;
    const jobID = params.job_id as string;
    try {
        const dynamo_params = {
            TableName: 'job-comments',
            IndexName: 'job_id-timestamp-index',
            KeyConditionExpression: 'job_id = :sk',
            ExpressionAttributeValues: {
                ':sk': jobID,
            },
        };

        const { Items } = await docClient.send(new QueryCommand(dynamo_params));

        return Response.json({ Items });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
