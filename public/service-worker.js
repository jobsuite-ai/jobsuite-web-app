self.addEventListener('message', (event) => {
    if (event.data.type === 'UPLOAD_FILE') {
        const { url, fields, file, fileName, contentType } = event.data.payload;
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
            .then((response) => {
            if (response.ok) {
                event.ports[0].postMessage({ success: true });
            }
            else {
                event.ports[0].postMessage({ success: false });
            }
        })
            .catch(() => {
            event.ports[0].postMessage({ success: false });
        });
    }
});
