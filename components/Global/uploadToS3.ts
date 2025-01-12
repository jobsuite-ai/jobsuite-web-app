export async function uploadToS3(
    
    file: File,
    presignedPostData: { url: string; fields: Record<string, string> }
): Promise<Response> {
    const formData = new FormData();

    // Add presigned fields
    Object.entries(presignedPostData.fields).forEach(([key, value]) => {
        formData.append(key, value);
    });

    // Append the file
    formData.append('file', file);

    // Perform the upload
    return fetch(presignedPostData.url, {
        method: 'POST',
        body: formData,
    });
}
