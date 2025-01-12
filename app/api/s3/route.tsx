import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: Request) {
  const { bucketName, objectKey } = await request.json();

  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });

    const command = new HeadObjectCommand({
      Bucket: bucketName as string,
      Key: objectKey as string,
    });

    await s3Client.send(command);
    return Response.json({ exists: true });
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return Response.json({ exists: false });
    }
    return Response.json({ error: 'Internal error while checking S3 object' });
  }
}
