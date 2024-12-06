import {
    DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: Request) {
    try {
        const {
            id,
            job_id,
            commenter,
            comment_contents,
            timestamp,
        } = await request.json();

        const command = new PutCommand({
            TableName: 'job-comments',
            Item: {
                id,
                job_id,
                commenter,
                comment_contents,
                timestamp,
            },
        });

        const data = await docClient.send(command);
        return Response.json({ data });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
