"use client";

import { Button, Tooltip } from '@mantine/core';
import { SingleJob } from '../../Global/model';

export function UploadNewTemplate({ template, job }: { template: string, job: SingleJob }) {
    async function createAndSendTemplate() {
        const templateResponse = await fetch(
            '/api/estimate_template',
            {
                method: 'POST',
                body: JSON.stringify({
                    template: template,
                })
            }
        );
        const templateData = await templateResponse.json();


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
        console.log('Sent docuseal request.');
    }

    const isDisabled = !(!!job.video && !!job.images && !!job.transcription_summary);

    return (
        <div style={{ marginBottom: 20 }}>
            <Tooltip
                label={isDisabled ? "Please finish the todo list above to send the estimate" : ""}
                disabled={!isDisabled}
                position="top"
                withArrow
            >
                <Button onClick={createAndSendTemplate} mt='lg' disabled={isDisabled} >
                    Send Estimate
                </Button>
            </Tooltip>
        </div>
    );
}