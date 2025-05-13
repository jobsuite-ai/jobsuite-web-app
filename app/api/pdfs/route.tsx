import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

import { logToCloudWatch } from '@/public/logger';

export async function POST(request: Request) {
    const { filename, contentType, jobID } = await request.json();

    try {
        const client = new S3Client({ region: process.env.AWS_REGION });
        const fileKey = `${jobID}/${filename}`;

        const { url, fields } = await createPresignedPost(client, {
            Bucket: process.env.AWS_PDF_BUCKET_NAME as string,
            Key: fileKey,
            Conditions: [
                ['content-length-range', 0, 50 * 1024 * 1024], // 50MB max
                ['starts-with', '$Content-Type', contentType],
            ],
            Fields: {
                acl: 'public-read',
                'Content-Type': contentType,
            },
            Expires: 600,
        });

        return Response.json({ url, fields });
    } catch (error: any) {
        logToCloudWatch(`Failed to generate presigned post url for PDF upload: ${error.stack}`);
        return Response.json({ error: error.message });
    }
}
