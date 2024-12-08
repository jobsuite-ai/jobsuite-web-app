import {
    DynamoDBClient,
    GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function GET(req: Request, { params }: { params: any }) {
    const { client_id } = await params;
    const clientID = client_id as string;

    try {
        if (clientID) {
            const getItemCommand = new GetItemCommand({
                TableName: 'client',
                Key: {
                    id: { S: clientID },
                },
            });
            const { Item } = await docClient.send(getItemCommand);

            return Response.json({ Item });
        }

        throw Error('ClientID must be defined to get a client');
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
