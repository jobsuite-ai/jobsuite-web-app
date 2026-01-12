'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Flex, Paper } from '@mantine/core';
import { remark } from 'remark';
import html from 'remark-html';
import { v4 as uuidv4 } from 'uuid';

import EstimateTodo from './EstimateTodo';
import { EstimateLineItem } from './LineItem';
import classes from '../styles/EstimateDetails.module.css';

import { generateTemplate } from '@/app/api/estimate_template/template_builder';
import { TemplateDescription, TemplateInput } from '@/app/api/estimate_template/template_model';
import { getApiHeaders } from '@/app/utils/apiClient';
import { UploadNewTemplate } from '@/components/EstimateDetails/estimate/UploadNewTemplate';
import LoadingState from '@/components/Global/LoadingState';
import { ContractorClient, Estimate, EstimateResource } from '@/components/Global/model';
import UniversalError from '@/components/Global/UniversalError';

interface EstimatePreviewProps {
    estimate: Estimate;
    imageResources?: EstimateResource[];
    videoResources?: EstimateResource[];
    lineItems?: EstimateLineItem[];
    client?: ContractorClient;
    hideTodo?: boolean;
    signatureUrl?: string | null;
    loadingSignatureUrl?: boolean;
    signatureRefreshKey?: number; // When this changes, refresh signatures
}

export default function EstimatePreview({
    estimate,
    imageResources = [],
    videoResources = [],
    lineItems = [],
    client,
    hideTodo = false,
    signatureUrl,
    loadingSignatureUrl = false,
    signatureRefreshKey,
}: EstimatePreviewProps) {
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [template, setTemplate] = useState<string>('');
    const templateRef = useRef<HTMLDivElement>(null);
    const [signatures, setSignatures] = useState<Array<{
        signature_type: string;
        signature_data: string;
        signer_name?: string;
    }>>([]);

    // Get image path from resources - prioritize cover photo
    const getImagePath = useCallback(() => {
        if (!imageResources || imageResources.length === 0) {
            return '';
        }

        // Determine region based on branch (not NODE_ENV, which is always 'production' in builds)
        const branch = process.env.AWS_BRANCH || process.env.AMPLIFY_BRANCH;
        const isProduction = branch === 'production' || branch === 'prod';
        const region = isProduction ? 'us-east-1' : 'us-west-2';

        // Find cover photo if specified, otherwise use first image
        let selectedImage = imageResources[0];
        if (estimate.cover_photo_resource_id) {
            const coverPhoto = imageResources.find(
                (img) => img.id === estimate.cover_photo_resource_id
            );
            if (coverPhoto) {
                selectedImage = coverPhoto;
            }
        }

        // If we have s3_bucket and s3_key, construct the correct S3 URL
        if (selectedImage.s3_bucket && selectedImage.s3_key) {
            const bucket = selectedImage.s3_bucket;
            return `https://${bucket}.s3.${region}.amazonaws.com/${selectedImage.s3_key}`;
        }

        // Legacy fallback: use resource_location
        if (selectedImage.resource_location) {
            // Try to extract bucket and key from resource_location if it's a full path
            // Otherwise, use the old format
            const getImageBucket = () => {
                const env = isProduction ? 'prod' : 'dev';
                return `jobsuite-resource-images-${env}`;
            };
            const bucket = selectedImage.s3_bucket || getImageBucket();
            return `https://${bucket}.s3.${region}.amazonaws.com/${selectedImage.resource_location}`;
        }

        return '';
    }, [imageResources, estimate.cover_photo_resource_id]);

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
                    name: client.name || 'Undefined Name',
                    city: estimate.address_city || estimate.city || '',
                    state: estimate.address_state || estimate.state || '',
                    email: client.email || 'Undefined Email',
                    address: estimate.address_street || estimate.client_address || '',
                    phone: client.phone_number || 'Undefined Phone Number',
                },
                items: templateLineItems,
                image: imagePath,
                notes: htmlString,
                discountReason: estimate.discount_reason,
                discountPercentage: estimate.discount_percentage,
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
    }, [
        client,
        estimate,
        imageResources,
        lineItems,
        getImagePath,
        estimate.cover_photo_resource_id,
    ]);

    // Fetch signatures for the estimate
    useEffect(() => {
        const fetchSignatures = async () => {
            try {
                const response = await fetch(
                    `/api/estimates/${estimate.id}/signatures`,
                    {
                        method: 'GET',
                        headers: getApiHeaders(),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    setSignatures(data.signatures || []);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error fetching signatures:', error);
            }
        };

        fetchSignatures();
    }, [estimate.id, signatureRefreshKey]);

    useEffect(() => {
        setLoading(true);
        buildTemplate().finally(() => setLoading(false));
    }, [buildTemplate]);

    // Place signatures on signature lines after template is rendered
    useEffect(() => {
        if (!template || !templateRef.current || signatures.length === 0) {
            return;
        }

        // Wait a bit for the DOM to be fully rendered
        const timeoutId = setTimeout(() => {
            if (!templateRef.current) return;

            // Find signature fields and place signatures
            const signatureFields = templateRef.current.querySelectorAll('signature-field');

            if (signatureFields.length === 0) {
                // eslint-disable-next-line no-console
                console.warn('No signature-field elements found in template');
                return;
            }

            signatureFields.forEach((field) => {
                const role = field.getAttribute('role');
                if (!role) return;

                // Match signature type to role
                let signatureType: string | null = null;
                if (role === 'Service Provider') {
                    signatureType = 'CONTRACTOR';
                } else if (role === 'Property Owner') {
                    signatureType = 'CLIENT';
                }

                if (!signatureType) return;

                // Find matching signature
                const signature = signatures.find(
                    (sig) => sig.signature_type === signatureType
                );

                if (signature && signature.signature_data) {
                    // Ensure signature_data is in the correct format (data URL)
                    let signatureDataUrl = signature.signature_data;
                    if (!signatureDataUrl.startsWith('data:')) {
                        // If it's just base64, add the data URL prefix
                        signatureDataUrl = `data:image/png;base64,${signatureDataUrl}`;
                    }

                    // Create an img element with the signature
                    const img = document.createElement('img');
                    img.src = signatureDataUrl;
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    img.style.maxHeight = '80px';
                    img.style.objectFit = 'contain';
                    img.style.display = 'block';
                    img.alt = signature.signer_name || 'Signature';

                    // Clear the field and add the signature image
                    field.innerHTML = '';
                    field.appendChild(img);

                    // eslint-disable-next-line no-console
                    console.log(`Placed ${signatureType} signature on ${role} field`);
                } else {
                    // eslint-disable-next-line no-console
                    console.log(`No signature found for ${signatureType} (role: ${role})`);
                }
            });
        }, 100); // Small delay to ensure DOM is ready

        // eslint-disable-next-line consistent-return
        return () => {
            clearTimeout(timeoutId);
        };
    }, [template, signatures]);

    // Check if estimate has been signed by both parties (using existing signatures state)
    const isFullySigned = useMemo(() => {
        if (signatures.length === 0) return false;
        const hasClient = signatures.some((sig) => sig.signature_type === 'CLIENT');
        const hasContractor = signatures.some((sig) => sig.signature_type === 'CONTRACTOR');
        return hasClient && hasContractor;
    }, [signatures]);

    // Check if all required todos are complete
    const hasAllItems =
        imageResources.length > 0 &&
        videoResources.length > 0 &&
        !!estimate.transcription_summary &&
        lineItems.length > 0;

    // If estimate is fully signed, always show preview regardless of resource completion
    const shouldShowPreview = isFullySigned || hasAllItems;

    return (
        <>{loading || isSending || !client ? <LoadingState /> :
            <div className={classes.estimatePreviewWrapper}>
                {estimate ?
                    <Flex direction="column" gap="md" justify="center" align="center">
                        {!hideTodo && !isFullySigned && (
                            <EstimateTodo
                              hasImages={imageResources.length > 0}
                              hasVideo={videoResources.length > 0}
                              hasTranscriptionSummary={!!estimate.transcription_summary}
                              hasLineItems={lineItems.length > 0}
                            />
                        )}
                        {shouldShowPreview && template && (
                            <Paper shadow="sm" radius="md" withBorder>
                                <div
                                  ref={templateRef}
                                  dangerouslySetInnerHTML={{ __html: template }}
                                />
                            </Paper>
                        )}
                        {!hideTodo && hasAllItems && (
                            <UploadNewTemplate
                              estimate={estimate}
                              client={client}
                              setLoading={setIsSending}
                              imageResources={imageResources}
                              videoResources={videoResources}
                              lineItems={lineItems}
                              signatureUrl={signatureUrl}
                              loadingSignatureUrl={loadingSignatureUrl}
                            />
                        )}
                    </Flex>
                    : <UniversalError message="Unable to access estimate details" />
                }
            </div>
        }
        </>
    );
}
