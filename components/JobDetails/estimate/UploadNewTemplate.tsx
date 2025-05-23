'use client';

import { Button, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { JobStatus, SingleJob } from '../../Global/model';

import updateJobStatus from '@/components/Global/updateJobStatus';

export function UploadNewTemplate({ template, job, clientEmail, setLoading }: {
    template: string,
    job: SingleJob,
    clientEmail: string,
    setLoading: Function
}) {
    async function createAndSendTemplate() {
        setLoading(true);
        const templateResponse = await fetch(
            '/api/estimate_template',
            {
                method: 'POST',
                body: JSON.stringify({
                    template,
                    jobID: job.id.S,
                }),
            }
        );
        const templateData = await templateResponse.json();

        const sendResponse = await fetch(
            '/api/send_estimate',
            {
                method: 'POST',
                body: JSON.stringify({
                    template_id: templateData.out.id,
                    jobID: job.id.S,
                    client_email: clientEmail,
                }),
            }
        );
        await sendResponse.json();

        await updateJobStatus(JobStatus.ESTIMATE_SENT, job.id.S);
        setLoading(false);
        notifications.show({
            title: 'Success!',
            position: 'top-center',
            color: 'green',
            message: 'The estimate was successfully sent!',
        });
    }

    const isDisabled = !(
        !!job.video &&
        !!job.images &&
        !!job.transcription_summary &&
        !!job.line_items
    );

    return (
        <div style={{ marginBottom: 20 }}>
            <Tooltip
              label={isDisabled ? 'Please finish the todo list above to send the estimate' : ''}
              disabled={!isDisabled}
              position="top"
              withArrow
            >
                <Button onClick={createAndSendTemplate} mt="lg" disabled={isDisabled}>
                    Send Estimate
                </Button>
            </Tooltip>
        </div>
    );
}
