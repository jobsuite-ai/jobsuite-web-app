import {
    DynamoDBClient,
    GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function GET(req: Request, { params }: { params: { job_id: string } }) {
    const jobID = params.job_id as string;

    try {
        if (jobID) {
            const getItemCommand = new GetItemCommand({
                TableName: process.env.JOB_TABLE_NAME,
                Key: {
                    id: { S: jobID },
                },
            });
            const { Item } = await docClient.send(getItemCommand);

            return Response.json({ Item });
        }
            throw Error('JobID must be defined to get a job');
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
