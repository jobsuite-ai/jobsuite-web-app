import { logToCloudWatch } from './logger';

// eslint-disable-next-line no-restricted-globals
self.addEventListener('message', (event: MessageEvent) => {
    if (event.data.type === 'UPLOAD_FILE') {
        const { url, fields, file, fileName, contentType } = event.data.payload as {
            url: string;
            fields: Record<string, string>;
            file: ArrayBuffer;
            fileName: string;
            contentType: string;
        };

        // Reconstruct the file using Blob
        const reconstructedFile = new File([file], fileName, { type: contentType });

        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => {
            formData.append(key, value);
        });
        formData.append('file', reconstructedFile);

        fetch(url, {
            method: 'POST',
            body: formData,
        })
            .then(async (response) => {
                if (response.ok) {
                    event.ports[0].postMessage({ success: true });
                } else {
                    const errorText = await response.text();
                    logToCloudWatch(`Failed to upload file to S3: ${errorText}`);
                    event.ports[0].postMessage({
                        success: false,
                        error: `Upload failed with status ${response.status}: ${errorText}`,
                    });
                }
            })
            .catch((error: any) => {
                logToCloudWatch(`Error uploading file to S3: ${error.stack}`);
                event.ports[0].postMessage({
                    success: false,
                    error: `Upload failed: ${error.message}`,
                });
            });
    }
});
