"use client";

import { Button, Tooltip } from '@mantine/core';
import { JobStatus, SingleJob } from '../../Global/model';
import updateJobStatus from '@/components/Global/updateJobStatus';
import { notifications } from '@mantine/notifications';

export function UploadNewTemplate({ template, job, setLoading }: { template: string, job: SingleJob, setLoading: Function }) {
    async function createAndSendTemplate() {
        setLoading(true);
        const templateResponse = await fetch(
            '/api/estimate_template',
            {
                method: 'POST',
                body: JSON.stringify({
                    template: template,
                    jobID: job.id.S,
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
                    jobID: job.id.S,
                })
            }
        );
        const sendData = await sendResponse.json();

        await updateJobStatus(JobStatus.ESTIMATE_SENT, job.id.S);
        setLoading(false);
        notifications.show({
            title: 'Success!',
            position: 'top-center',
            color: 'green',
            message: 'The estimate was successfully sent!',
        });
    }

    const isDisabled = !(!!job.video && !!job.images && !!job.transcription_summary && !!job.line_items);

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