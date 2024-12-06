import CloudConvert from 'cloudconvert';

export async function POST(request: Request) {
    const { filename, jobID } = await request.json();

    try {
        const fileKey = `${jobID}/${filename}`;

        // convert video to flac
        const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY as string);

        const job = await cloudConvert.jobs.create({
            tasks: {
                import: {
                    operation: 'import/s3',
                    bucket: process.env.AWS_BUCKET_NAME as string,
                    region: 'us-west-2',
                    access_key_id: process.env.AWS_ACCESS_KEY_ID as string,
                    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY as string,
                    key: fileKey,
                },
                convert: {
                    operation: 'convert',
                    input_format: 'mov',
                    output_format: 'flac',
                    engine: 'ffmpeg',
                    input: ['import'],
                    audio_codec: 'flac',
                    audio_bitrate: 128,
                    filename: 'converted_audio.flac',
                },
                export: {
                    operation: 'export/s3',
                    input: ['convert'],
                    bucket: process.env.AWS_BUCKET_NAME as string,
                    region: 'us-west-2',
                    access_key_id: process.env.AWS_ACCESS_KEY_ID as string,
                    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY as string,
                    key: `${jobID}/audio/converted_audio.flac`,
                },
            },
        });

        return Response.json({ job });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
