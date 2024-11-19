"use client";

import { Button } from '@mantine/core';

export function UploadNewTemplate() {
    async function createAndSendTemplate() {
        const templateResponse = await fetch(
            '/api/estimate_template',
            {
                method: 'POST',
                body: JSON.stringify({
                    client_name: 'Test Name',
                })
            }
        );
        const templateData = await templateResponse.json();
        
        console.log("Template creation");
        console.log(templateData);

        const sendResponse = await fetch(
            '/api/send_estimate',
            {
                method: 'POST',
                body: JSON.stringify({
                    template_id: templateData.out.id,
                })
            }
        );
        const sendData = await sendResponse.json();
        console.log('Estimate response');
        console.log(sendData);
    }

    return (
        <div className='workflow-container'>
            <Button variant="default" onClick={createAndSendTemplate}>
                Create Template
            </Button>
        </div>
    );
}