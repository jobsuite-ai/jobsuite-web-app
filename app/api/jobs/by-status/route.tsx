import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const statuses = searchParams.getAll('status');

        if (statuses.length === 0) {
            return Response.json({ error: 'At least one status parameter is required' }, { status: 400 });
        }

        // Make separate queries for each status
        const queries = statuses.map(status => {
            const params = {
                TableName: 'job',
                IndexName: 'user_id-job_status-index',
                KeyConditionExpression: 'user_id = :pk AND job_status = :sk',
                ExpressionAttributeValues: {
                    ':pk': process.env.RLPP_USER_ID,
                    ':sk': status,
                },
                ScanIndexForward: true,
            };
            return docClient.send(new QueryCommand(params));
        });

        // Wait for all queries to complete
        const results = await Promise.all(queries);

        // Combine all items from all queries
        const allItems = results.reduce((acc: any[], result) =>
            [...acc, ...(result.Items || [])], []
        );

        return Response.json({ Items: allItems });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
