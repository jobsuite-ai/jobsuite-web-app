import {
    DynamoDBClient,
    GetItemCommand,
    UpdateItemCommand,
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

export async function PUT(request: Request, { params }: { params: any }) {
    const { client_id } = await params;
    const clientID = client_id as string;

    const { email, phone_number, client_name } = await request.json();

    const updateExpressions = [];
    let attributeValues = {};

    if (email) {
        attributeValues = { ...attributeValues, ':email': { S: email } };
        updateExpressions.push('email = :email');
    }
    if (phone_number) {
        attributeValues = { ...attributeValues, ':phone_number': { S: phone_number } };
        updateExpressions.push('phone_number = :phone_number');
    }
    if (client_name) {
        attributeValues = { ...attributeValues, ':client_name': { S: client_name } };
        updateExpressions.push('client_name = :client_name');
    }

    const updateExpression = `SET ${updateExpressions.join(', ')}`;

    try {
        const updateItemCommand = new UpdateItemCommand({
            ExpressionAttributeValues: attributeValues,
            Key: { id: { S: clientID } },
            ReturnValues: 'UPDATED_NEW',
            TableName: 'client',
            UpdateExpression: updateExpression,
        });
        const { Attributes } = await client.send(updateItemCommand);
        return Response.json({ Attributes });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
