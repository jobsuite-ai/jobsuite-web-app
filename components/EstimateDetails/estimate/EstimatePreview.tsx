'use client';

import { useCallback, useEffect, useState } from 'react';

import { Flex, Paper } from '@mantine/core';
import { remark } from 'remark';
import html from 'remark-html';
import { v4 as uuidv4 } from 'uuid';

import EstimateTodo from './EstimateTodo';
import { EstimateLineItem } from './LineItem';
import classes from '../styles/EstimateDetails.module.css';

import { generateTemplate } from '@/app/api/estimate_template/template_builder';
import { TemplateDescription, TemplateInput } from '@/app/api/estimate_template/template_model';
import { UploadNewTemplate } from '@/components/EstimateDetails/estimate/UploadNewTemplate';
import LoadingState from '@/components/Global/LoadingState';
import { DynamoClient, Estimate, EstimateResource } from '@/components/Global/model';
import UniversalError from '@/components/Global/UniversalError';

interface EstimatePreviewProps {
    estimate: Estimate;
    imageResources?: EstimateResource[];
    videoResources?: EstimateResource[];
    lineItems?: EstimateLineItem[];
    client?: DynamoClient;
}

export default function EstimatePreview({
    estimate,
    imageResources = [],
    videoResources = [],
    lineItems = [],
    client,
}: EstimatePreviewProps) {
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [template, setTemplate] = useState<string>('');

    // Get image path from resources
    const getImagePath = useCallback(() => {
        if (!imageResources || imageResources.length === 0) {
            return '';
        }

        const firstImage = imageResources[0];
        // If we have s3_bucket and s3_key, construct the correct S3 URL
        if (firstImage.s3_bucket && firstImage.s3_key) {
            const bucket = firstImage.s3_bucket;
            const region = 'us-west-2'; // Default region
            return `https://${bucket}.s3.${region}.amazonaws.com/${firstImage.s3_key}`;
        }

        // Legacy fallback: use resource_location
        if (firstImage.resource_location) {
            // Try to extract bucket and key from resource_location if it's a full path
            // Otherwise, use the old format
            const getImageBucket = () => {
                const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
                return `jobsuite-resource-images-${env}`;
            };
            const bucket = firstImage.s3_bucket || getImageBucket();
            const region = 'us-west-2';
            return `https://${bucket}.s3.${region}.amazonaws.com/${firstImage.resource_location}`;
        }

        return '';
    }, [imageResources]);

    const buildTemplate = useCallback(async () => {
        const result = await remark().use(html).process(estimate.transcription_summary || '');
        const htmlString = result.toString();

        // Use line items from props
        const templateLineItems: TemplateDescription[] = lineItems.map((item) => ({
            header: item.title,
            content: item.description,
            price: item.hours * item.rate,
            hours: item.hours,
        }));

        const imagePath = getImagePath();

        if (client) {
            const estimateNumber = uuidv4().split('-')[0];
            const templateInput: TemplateInput = {
                client: {
                    name: client.name.S || 'Undefined Name',
                    city: estimate.address_city || estimate.city || '',
                    state: estimate.address_state || estimate.state || '',
                    email: client.email.S || 'Undefined Email',
                    address: estimate.address_street || estimate.client_address || '',
                    phone: client.phone_number.S || 'Undefined Phone Number',
                },
                items: templateLineItems,
                image: imagePath,
                notes: htmlString,
                discountReason: estimate.discount_reason,
                estimateNumber,
                rate: estimate.hourly_rate,
            };

            const fullTemplate = generateTemplate(templateInput);

            // Extract body content from the full HTML document
            // Body contains: <div class="full-page-wrapper">...</div>
            const bodyMatch = fullTemplate.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            let bodyContent = bodyMatch ? bodyMatch[1].trim() : '';

            // If body extraction failed, try alternative extraction
            if (!bodyContent) {
                const bodyStart = fullTemplate.indexOf('<body');
                const bodyEnd = fullTemplate.indexOf('</body>');
                if (bodyStart !== -1 && bodyEnd !== -1) {
                    const bodyTagEnd = fullTemplate.indexOf('>', bodyStart) + 1;
                    bodyContent = fullTemplate.substring(bodyTagEnd, bodyEnd).trim();
                }
            }

            // Extract styles from head
            const styleMatch = fullTemplate.match(/<style[^>]*>([\s\S]*)<\/style>/i);
            const styles = styleMatch ? styleMatch[1] : '';

            // Body content already has full-page-wrapper and container divs
            // Just wrap with body-wrapper class for proper styling context
            const wrappedContent = bodyContent
                ? `<div class="body-wrapper">${bodyContent}</div>`
                : bodyContent;

            // Combine styles and wrapped body content
            if (wrappedContent) {
                setTemplate(`<style>${styles}</style>${wrappedContent}`);
            } else {
                // eslint-disable-next-line no-console
                console.error('Failed to extract template content');
                setTemplate('');
            }
        } else {
            // If no client, clear template
            setTemplate('');
        }
    }, [client, estimate, imageResources, lineItems, getImagePath]);

    useEffect(() => {
        setLoading(true);
        buildTemplate().finally(() => setLoading(false));
    }, [buildTemplate]);

    return (
        <>{loading || isSending || !client ? <LoadingState /> :
            <div className={classes.estimatePreviewWrapper}>
                {estimate ?
                    <Flex direction="column" gap="md" justify="center" align="center">
                        <EstimateTodo
                          hasImages={imageResources.length > 0}
                          hasVideo={videoResources.length > 0}
                          hasTranscriptionSummary={!!estimate.transcription_summary}
                          hasLineItems={lineItems.length > 0}
                        />
                        {template ? (
                            <Paper shadow="sm" radius="md" withBorder>
                                <div dangerouslySetInnerHTML={{ __html: template }} />
                            </Paper>
                        ) : (
                            <Paper shadow="sm" radius="md" withBorder p="md">
                                <div>
                                    Unable to generate estimate preview.
                                     Please ensure all required information is available.
                                </div>
                            </Paper>
                        )}

                        <UploadNewTemplate
                          template={template}
                          estimate={estimate}
                          clientEmail={client.email.S}
                          setLoading={setIsSending}
                        />
                    </Flex>
                    : <UniversalError message="Unable to access estimate details" />
                }
            </div>
        }
        </>
    );
}
