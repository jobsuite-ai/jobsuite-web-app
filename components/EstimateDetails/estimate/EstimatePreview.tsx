'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Flex, Paper } from '@mantine/core';

import { EstimateLineItem } from './LineItem';
import classes from '../styles/EstimateDetails.module.css';

import { UploadNewTemplate } from '@/components/EstimateDetails/estimate/UploadNewTemplate';
import LoadingState from '@/components/Global/LoadingState';
import { ContractorClient, Estimate, EstimateResource } from '@/components/Global/model';
import UniversalError from '@/components/Global/UniversalError';
import { buildEstimateTemplateHtml } from '@/utils/estimatePdfGenerator';

interface EstimatePreviewProps {
    estimate: Estimate;
    imageResources?: EstimateResource[];
    videoResources?: EstimateResource[];
    lineItems?: EstimateLineItem[];
    client?: ContractorClient;
    hideTodo?: boolean;
    signatureUrl?: string | null;
    loadingSignatureUrl?: boolean;
    signatures?: Array<{
        signature_type: string;
        signature_data?: string;
        signer_name?: string;
        is_valid?: boolean;
    }>; // Signatures passed from parent (already loaded)
    onSignatureUrlGenerated?: (url: string) => void;
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
    signatures: propSignatures = [],
    onSignatureUrlGenerated,
}: EstimatePreviewProps) {
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [template, setTemplate] = useState<string>('');
    const templateRef = useRef<HTMLDivElement>(null);
    // Use signatures from props (already loaded by parent)
    const signatures = propSignatures.filter((sig) => sig.is_valid !== false);

    const buildTemplate = useCallback(async () => {
        if (!client) {
            setTemplate('');
            return;
        }

        try {
            const htmlTemplate = await buildEstimateTemplateHtml({
                estimate,
                client,
                lineItems,
                imageResources,
            });
            setTemplate(htmlTemplate);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to build estimate template:', error);
            setTemplate('');
        }
    }, [
        client,
        estimate,
        lineItems,
        imageResources,
    ]);

    // Signatures are now passed as props from parent, no need to fetch independently

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
        const hasClient = signatures.some(
            (sig) => sig.signature_type === 'CLIENT' && sig.is_valid !== false
        );
        const hasContractor = signatures.some(
            (sig) => sig.signature_type === 'CONTRACTOR' && sig.is_valid !== false
        );
        return hasClient && hasContractor;
    }, [signatures]);

    // Check if any signatures exist (even if not fully signed)
    const hasAnySignatures = useMemo(() => (
        signatures.length > 0 && signatures.some(
            (sig) => sig.is_valid !== false && sig.signature_data
        )
    ), [signatures]);

    // Check if all required todos are complete
    const hasAllItems =
        imageResources.length > 0 &&
        videoResources.length > 0 &&
        !!estimate.transcription_summary &&
        lineItems.length > 0;

    // Show preview if fully signed, has all items, OR has any signatures
    const shouldShowPreview = isFullySigned || hasAllItems || hasAnySignatures;

    return (
        <>{loading || isSending || !client ? <LoadingState /> :
            <div className={classes.estimatePreviewWrapper}>
                {estimate ?
                    <Flex direction="column" gap="md" justify="center" align="center">
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
                              onSignatureUrlGenerated={onSignatureUrlGenerated}
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
