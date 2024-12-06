import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

export async function POST(request: Request) {
    const { filename, contentType, jobID } = await request.json();

    try {
        const client = new S3Client({ region: process.env.AWS_REGION });

        const { url, fields } = await createPresignedPost(client, {
            Bucket: process.env.AWS_IMAGE_BUCKET_NAME as string,
            Key: `${jobID}/${filename}`,
            Conditions: [
                ['content-length-range', 0, 150 * 1024 * 1024],
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
        return Response.json({ error: error.message });
    }
}
