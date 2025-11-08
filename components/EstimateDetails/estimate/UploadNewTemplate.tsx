'use client';

import { Button, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { Estimate, EstimateStatus } from '../../Global/model';

import updateJobStatus from '@/components/Global/updateJobStatus';

export function UploadNewTemplate({ template, estimate, clientEmail, setLoading }: {
    template: string,
    estimate: Estimate,
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
                    jobID: estimate.id,
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
                    jobID: estimate.id,
                    client_email: clientEmail,
                }),
            }
        );
        await sendResponse.json();

        await updateJobStatus(EstimateStatus.ESTIMATE_SENT, estimate.id);
        setLoading(false);
        notifications.show({
            title: 'Success!',
            position: 'top-center',
            color: 'green',
            message: 'The estimate was successfully sent!',
        });
    }

    const isDisabled = !(
        !!estimate.video &&
        !!estimate.images &&
        !!estimate.transcription_summary &&
        !!estimate.line_items
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
