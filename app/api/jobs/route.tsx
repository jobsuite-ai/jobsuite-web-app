import {
    DeleteItemCommand,
    DynamoDBClient,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { PutCommand, DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { JobStatus } from '@/components/Global/model';
import { JobImage, JobLineItem, JobVideo, UpdateClientDetailsInput, UpdateHoursAndRateInput, UpdateJobContent } from './jobTypes';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: Request) {
    try {
        const {
            jobID,
            job_type,
            client_id,
            client_name,
            client_address,
            city,
            state,
            zip_code,
            client_email,
            client_phone_number,
            video,
            hourly_rate,
        } = await request.json();

        const command = new PutCommand({
            TableName: process.env.JOB_TABLE_NAME,
            Item: {
                user_id: process.env.RLPP_USER_ID,
                id: jobID,
                job_status: JobStatus.ESTIMATE_NOT_SCHEDULED,
                job_type,
                client_id,
                client_name,
                client_address,
                city,
                state,
                zip_code,
                client_email,
                client_phone_number,
                video,
                hourly_rate,
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
            IndexName: 'user_id-job_status-index',
            KeyConditionExpression: 'user_id = :pk',
            ExpressionAttributeValues: {
                ':pk': process.env.RLPP_USER_ID,
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
    const typedContent: UpdateJobContent = content as UpdateJobContent;
    console.log(typedContent);
    console.log(jobID);

    typedContent.video && await setVideoFields(jobID, typedContent.video);
    typedContent.images && await addImages(jobID, typedContent.images);
    typedContent.line_item && await addLineItem(jobID, typedContent.line_item);
    typedContent.job_status && await setJobStatus(jobID, typedContent.job_status);
    typedContent.transcription_summary && await updateTrascriptionSummary(
        jobID,
        typedContent.transcription_summary
    );
    typedContent.estimate_date && await updateEstimateDate(jobID, typedContent.estimate_date);
    typedContent.delete_line_item !== undefined && await deleteLineItem(
        jobID,
        typedContent.delete_line_item
    );
    typedContent.delete_image && await deleteAllImages(jobID);
    typedContent.update_client_details && await updateClientDetails(
        jobID,
        typedContent.update_client_details
    );
    typedContent.update_client_name && await updateClientName(
        jobID, 
        typedContent.update_client_name
    );
    typedContent.update_hours_and_rate && await updateHoursAndRate(
        jobID,
        typedContent.update_hours_and_rate,
    );
    typedContent.delete_video && await deleteVideo(jobID);

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

async function deleteVideo(jobID: string) {
    try {
        const updateItemCommand = new UpdateItemCommand({
            Key: { id: { S: jobID } },
            TableName: 'job',
            UpdateExpression: `REMOVE video, transcription_summary, spanish_transcription`,
            ReturnValues: 'UPDATED_NEW',
        });

        const { Attributes } = await client.send(updateItemCommand);

        return Response.json({ Attributes });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

async function deleteLineItem(jobID: string, index: number) {
    try {
        const updateItemCommand = new UpdateItemCommand({
            Key: { id: { S: jobID } },
            TableName: 'job',
            UpdateExpression: `REMOVE line_items[${index}]`,
            ReturnValues: 'UPDATED_NEW',
        });

        const { Attributes } = await client.send(updateItemCommand);

        return Response.json({ Attributes });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

async function addLineItem(jobID: string, lineItem: JobLineItem) {
    try {
        const updatedLineItem = {
            M: {
                id: { S: lineItem.id },
                header: { S: lineItem.header },
                description: { S: lineItem.description },
                price: { N: lineItem.price.toString() },
            },
        };

        const updateItemCommand = new UpdateItemCommand({
            ExpressionAttributeValues: {
                ':new_line_items': {
                    L: [updatedLineItem],
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

async function updateClientName(jobID: string, clientName: string) {
    try {
        const updateItemCommand = new UpdateItemCommand({
            ExpressionAttributeValues: {':name': { S: clientName }},
            Key: { id: { S: jobID } },
            ReturnValues: 'UPDATED_NEW',
            TableName: 'job',
            UpdateExpression: `SET client_name = :name`,
        });

        console.log(updateItemCommand);

        const { Attributes } = await client.send(updateItemCommand);
        return Response.json({ Attributes });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

async function updateClientDetails(jobID: string, clientDetails: UpdateClientDetailsInput) {
    try {
        const updateItemCommand = new UpdateItemCommand({
            ExpressionAttributeValues: {
                ':city': { S: clientDetails.city },
                ':zc': { S: clientDetails.zip_code },
                ':ca': { S: clientDetails.client_address },
            },
            Key: { id: { S: jobID } },
            ReturnValues: 'UPDATED_NEW',
            TableName: 'job',
            UpdateExpression: `
                SET city = :city,
                zip_code = :zc,
                client_address = :ca
            `,
        });

        const { Attributes } = await client.send(updateItemCommand);
        return Response.json({ Attributes });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

async function setJobStatus(jobID: string, jobStatus: JobStatus) {
    try {
        const updateItemCommand = new UpdateItemCommand({
            ExpressionAttributeValues: { ':status': { S: jobStatus } },
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

async function updateTrascriptionSummary(jobID: string, transcriptionSummary: string) {
    try {
        const updateItemCommand = new UpdateItemCommand({
            ExpressionAttributeValues: { ':summary': { S: transcriptionSummary } },
            Key: { id: { S: jobID } },
            ReturnValues: 'UPDATED_NEW',
            TableName: 'job',
            UpdateExpression: 'SET transcription_summary = :summary',
        });
        const { Attributes } = await client.send(updateItemCommand);

        return Response.json({ Attributes });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

async function updateEstimateDate(jobID: string, estimateDate: any) {
    try {
        const updateItemCommand = new UpdateItemCommand({
            ExpressionAttributeValues: { ':estimate_date': { S: estimateDate } },
            Key: { id: { S: jobID } },
            ReturnValues: 'UPDATED_NEW',
            TableName: 'job',
            UpdateExpression: 'SET estimate_date = :estimate_date',
        });
        const { Attributes } = await client.send(updateItemCommand);

        return Response.json({ Attributes });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

async function updateHoursAndRate(jobID: string, hoursAndRate: UpdateHoursAndRateInput) {
    try {
        const updateItemCommand = new UpdateItemCommand({
            ExpressionAttributeValues: {
                ':eh': { N: hoursAndRate.hours },
                ':hr': { N: hoursAndRate.rate },
                ':d': { S: hoursAndRate.date },
            },
            Key: { id: { S: jobID } },
            ReturnValues: 'UPDATED_NEW',
            TableName: 'job',
            UpdateExpression: 'SET estimate_hours = :eh, hourly_rate = :hr, estimate_date = :d',
        });
        const { Attributes } = await client.send(updateItemCommand);

        return Response.json({ Attributes });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}

async function setVideoFields(jobID: string, video: JobVideo) {
    try {
        const updateItemCommand = new UpdateItemCommand({
            ExpressionAttributeValues: {
                ':v': {
                    M: {
                        name: { S: video.name.toString() },
                        size: { N: video.size.toString() },
                        lastModified: { N: video.lastModified.toString() },
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

async function addImages(jobID: string, images: JobImage[]) {
    try {
        const imageObject = new Array<any>();
        images.forEach((image: JobImage) => {
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

async function deleteAllImages(jobID: string) {
    try {
        const updateItemCommand = new UpdateItemCommand({
            Key: { id: { S: jobID } },
            TableName: 'job',
            UpdateExpression: 'REMOVE images',
            ReturnValues: 'UPDATED_NEW',
        });

        const { Attributes } = await client.send(updateItemCommand);

        return Response.json({ Attributes });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
