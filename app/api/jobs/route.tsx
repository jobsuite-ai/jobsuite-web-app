import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

// // endpoint to get the list of files in the bucket
// export async function GET(): Promise<ResponseData> {
//     try {
//         const Key = jobID + '-' + video.name;
//         const command = new GetObjectCommand({
//             Bucket: Bucket,
//             Key: Key,
//         });

//         const url = await getSignedUrl(s3, command);

//         return new NextResponse(url)
//     } catch (error) {
//         console.error('Error fetching image from S3:', error);
//         return new Response('Error fetching image from S3');
//     }
// }

// endpoint to upload a file to the bucket
// export async function POST(request: NextRequest) {
//     console.log("Executing post for job video");
//     const formData = await request.formData();
//     const files = formData.getAll("file") as File[];
//     const jobID = formData.get("jobID") as string;

//     const response = await Promise.all(
//         files.map(async (file) => {
//             const Body = (await file.arrayBuffer()) as Buffer;
//             const file_key = jobID + '/' + file.name;
//             s3.send(new PutObjectCommand({ Bucket, Key: file_key, Body }));
//         })
//     );

//     return NextResponse.json(response);
// }

export async function POST(request: Request) {
    const { filename, contentType, jobID } = await request.json()
  
    try {
        const client = new S3Client({ region: process.env.AWS_REGION });

        // const client = new S3Client({
        //     region: process.env.AWS_REGION,
        //     accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
        // });
        const { url, fields } = await createPresignedPost(client, {
            Bucket: process.env.AWS_BUCKET_NAME as string,
            Key: jobID + '/' + filename,
            Conditions: [
                ['content-length-range', 0, 10485760], // up to 10 MB
                ['starts-with', '$Content-Type', contentType],
            ],
            Fields: {
                acl: 'public-read',
                'Content-Type': contentType,
            },
            Expires: 600, // Seconds before the presigned post expires. 3600 by default.
        })
  
        return Response.json({ url, fields })
    } catch (error: any) {
        return Response.json({ error: error.message })
    }
  }
