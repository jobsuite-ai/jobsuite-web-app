'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Paper } from '@mantine/core';
import { remark } from 'remark';
import html from 'remark-html';

import { EstimateLineItem } from '../estimate/LineItem';
import classes from '../styles/EstimateDetails.module.css';

import { generateTemplate } from '@/app/api/estimate_template/template_builder';
import { TemplateDescription, TemplateInput } from '@/app/api/estimate_template/template_model';
import { getApiHeaders } from '@/app/utils/apiClient';
import LoadingState from '@/components/Global/LoadingState';
import { ContractorClient, Estimate, EstimateResource } from '@/components/Global/model';

interface EstimateSignaturePreviewProps {
    estimate: Estimate;
    imageResources?: EstimateResource[];
    videoResources?: EstimateResource[];
    lineItems?: EstimateLineItem[];
    client?: ContractorClient;
    onSignatureClick?: () => void;
    showSignatureClickable?: boolean;
    signatures?: Array<{
        signature_type: string;
        signature_data: string;
        signer_name?: string;
        signer_email: string;
        signed_at: string;
        is_valid?: boolean;
    }>;
}

export default function EstimateSignaturePreview({
    estimate,
    imageResources = [],
    lineItems = [],
    client,
    onSignatureClick,
    showSignatureClickable = false,
    signatures: propSignatures,
}: EstimateSignaturePreviewProps) {
    const [loading, setLoading] = useState(true);
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
            const estimateNumber = estimate.id.split('-')[0];
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
            let wrappedContent = bodyContent
                ? `<div class="body-wrapper">${bodyContent}</div>`
                : bodyContent;

            // Add clickable signature section above Property Owner signature at bottom if enabled
            if (showSignatureClickable && wrappedContent && client) {
                // Find the Property Owner signature section and add clickable signature
                // line directly above it
                // We need to insert it inside the second signature-field-wrapper, at the beginning
                const signatureClickableSection = `
                    <div class="signature-clickable-section" data-signature-clickable="true" style="
                        margin-bottom: 15px;
                        padding: 15px;
                        border: 2px dashed #2c3e50;
                        border-radius: 6px;
                        text-align: center;
                        cursor: pointer;
                        background-color: #f8f9fa;
                        transition: all 0.2s ease;
                        width: 100%;
                        box-sizing: border-box;
                    ">
                        <p style="margin: 0; color: #2c3e50; font-weight: 600; font-size: 16px;">
                            Click here to sign this estimate
                        </p>
                    </div>
                `;

                const clientNameEscaped = client.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                // Insert the clickable section inside the second signature-field-wrapper
                // (Property Owner). Match the opening tag of the second
                // signature-field-wrapper and insert right after it
                wrappedContent = wrappedContent.replace(
                    /(<div class="signature-field-wrapper">[\s\S]*?<signature-field[^>]*role="Property Owner"[^>]*>)/i,
                    `$1${signatureClickableSection}`
                );

                // If that didn't work, try inserting at the start of the wrapper that contains
                // the client name
                if (!wrappedContent.includes('signature-clickable-section')) {
                    wrappedContent = wrappedContent.replace(
                        new RegExp(`(<div class="signature-field-wrapper">[\\s\\S]*?)(<signature-field[^>]*>[\\s\\S]*?<div class="signature-label">${clientNameEscaped}</div>)`, 'i'),
                        `$1${signatureClickableSection}$2`
                    );
                }
            }

            // Combine styles and wrapped body content
            if (wrappedContent) {
                setTemplate(`<style>${styles}</style>${wrappedContent}`);
            } else {
                // eslint-disable-next-line no-console
                console.error('Failed to extract template content');
                setTemplate('');
            }
        } else {
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

    // Fetch signatures for the estimate (if not provided as prop)
    useEffect(() => {
        // If signatures are provided as props, use them (even if empty array)
        // This ensures we use the filtered valid signatures from the signature page API
        // rather than fetching all signatures (including invalid ones) from the audit endpoint
        if (propSignatures !== undefined) {
            // Filter to only valid signatures if is_valid field is present
            const validSignatures = propSignatures.filter((sig) =>
                sig.is_valid !== false // Default to true if not specified
            );
            setSignatures(validSignatures.map((sig) => ({
                signature_type: sig.signature_type,
                signature_data: sig.signature_data,
                signer_name: sig.signer_name,
            })));
            return;
        }

        // Otherwise, fetch from API (only if propSignatures is not provided at all)
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
                    // Filter to only valid signatures from audit trail
                    const validSignatures = (data.signatures || []).filter((sig: any) =>
                        sig.is_valid !== false
                    );
                    setSignatures(validSignatures.map((sig: any) => ({
                        signature_type: sig.signature_type,
                        signature_data: sig.signature_data,
                        signer_name: sig.signer_name,
                    })));
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error fetching signatures:', error);
            }
        };

        fetchSignatures();
    }, [estimate.id, propSignatures]);

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

    // Add click handler and hover effects to signature clickable section after template is rendered
    useEffect(() => {
        if (!template || !showSignatureClickable || !onSignatureClick || !templateRef.current) {
            return;
        }

        const clickableSection = templateRef.current.querySelector('[data-signature-clickable="true"]') as HTMLElement;
        if (!clickableSection) {
            return;
        }

        // Add click handler
        const clickHandler = onSignatureClick;
        clickableSection.addEventListener('click', clickHandler);

        // Add hover effects
        const handleMouseEnter = () => {
            clickableSection.style.backgroundColor = '#e9ecef';
            clickableSection.style.borderColor = '#1a1f2e';
        };
        const handleMouseLeave = () => {
            clickableSection.style.backgroundColor = '#f8f9fa';
            clickableSection.style.borderColor = '#2c3e50';
        };

        clickableSection.addEventListener('mouseenter', handleMouseEnter);
        clickableSection.addEventListener('mouseleave', handleMouseLeave);

        // eslint-disable-next-line consistent-return
        return () => {
            clickableSection.removeEventListener('click', clickHandler);
            clickableSection.removeEventListener('mouseenter', handleMouseEnter);
            clickableSection.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [template, showSignatureClickable, onSignatureClick]);

    if (loading || !client) {
        return <LoadingState />;
    }

    if (!template) {
        return null;
    }

    return (
        <div className={classes.estimatePreviewWrapper}>
            <Paper shadow="sm" radius="md" withBorder>
                <div ref={templateRef} dangerouslySetInnerHTML={{ __html: template }} />
            </Paper>
        </div>
    );
}
