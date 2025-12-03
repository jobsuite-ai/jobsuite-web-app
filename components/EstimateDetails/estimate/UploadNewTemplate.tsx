'use client';

import { Button, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { EstimateLineItem } from './LineItem';
import { Estimate, EstimateResource, EstimateStatus } from '../../Global/model';

import updateJobStatus from '@/components/Global/updateJobStatus';

export function UploadNewTemplate({
    template,
    estimate,
    clientEmail,
    setLoading,
    imageResources = [],
    videoResources = [],
    lineItems = [],
}: {
    template: string,
    estimate: Estimate,
    clientEmail: string,
    setLoading: Function,
    imageResources?: EstimateResource[],
    videoResources?: EstimateResource[],
    lineItems?: EstimateLineItem[]
}) {
    async function createAndSendTemplate() {
        setLoading(true);
        try {
            // Step 1: Create template
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

            if (!templateResponse.ok) {
                const errorData = await templateResponse.json();
                throw new Error(errorData.error || 'Failed to create estimate template');
            }

            const templateData = await templateResponse.json();

            if (!templateData.out?.id) {
                throw new Error('Template created but no template ID returned');
            }

            // Step 2: Send estimate
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

            if (!sendResponse.ok) {
                const errorData = await sendResponse.json();
                throw new Error(errorData.error || 'Failed to send estimate');
            }

            // Step 3: Update job status
            await updateJobStatus(EstimateStatus.ESTIMATE_SENT, estimate.id);

            setLoading(false);
            notifications.show({
                title: 'Success!',
                position: 'top-center',
                color: 'green',
                message: 'The estimate was successfully sent!',
            });
        } catch (error: any) {
            setLoading(false);
            notifications.show({
                title: 'Error',
                position: 'top-center',
                color: 'red',
                message: error.message || 'Failed to send estimate. Please try again.',
            });
        }
    }

    const isDisabled = !(
        imageResources.length > 0 &&
        videoResources.length > 0 &&
        !!estimate.transcription_summary &&
        lineItems.length > 0
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
