import { remark } from 'remark';
import html from 'remark-html';
import { v4 as uuidv4 } from 'uuid';

import { generatePdfFromElement, generatePdfFromHtmlString } from './pdfGenerator';

import { generateTemplate } from '@/app/api/estimate_template/template_builder';
import { TemplateDescription, TemplateInput } from '@/app/api/estimate_template/template_model';
import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import { ContractorClient, Estimate, EstimateResource } from '@/components/Global/model';

interface Signature {
    signature_type: string;
    signature_data: string;
    signer_name?: string;
    is_valid?: boolean;
}

interface GenerateEstimatePdfParams {
    estimate: Estimate;
    client: ContractorClient;
    lineItems: EstimateLineItem[];
    imageResources: EstimateResource[];
    signatures?: Signature[];
}

interface BuildEstimateTemplateParams {
    estimate: Estimate;
    client: ContractorClient;
    lineItems: EstimateLineItem[];
    imageResources: EstimateResource[];
}

/**
 * Get image path from resources - prioritize cover photo
 */
async function getImagePath(
    estimate: Estimate,
    imageResources: EstimateResource[]
): Promise<string> {
    if (!imageResources || imageResources.length === 0) {
        return '';
    }

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

    // Try to get presigned URL if we have authentication and s3_bucket/s3_key
    const accessToken = localStorage.getItem('access_token');
    if (accessToken && selectedImage.s3_bucket && selectedImage.s3_key && selectedImage.id) {
        try {
            const response = await fetch(
                `/api/estimates/${estimate.id}/resources/${selectedImage.id}/presigned-url`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                const presignedUrl = data.presigned_url || data.url;
                if (presignedUrl) {
                    return presignedUrl;
                }
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Failed to get presigned URL for image:', error);
            // Fall through to direct URL construction
        }
    }

    // Fallback to direct URL construction
    const bucketName = selectedImage.s3_bucket || 'jobsuite-resource-images-dev';
    const isProduction = bucketName.includes('-prod');
    const region = isProduction ? 'us-east-1' : 'us-west-2';

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
}

export async function buildEstimateTemplateHtml(
    params: BuildEstimateTemplateParams
): Promise<string> {
    const { estimate, client, lineItems, imageResources } = params;

    // Get image path with presigned URL
    const imagePath = await getImagePath(estimate, imageResources);

    // Process transcription summary to HTML
    const transcriptionSummary = estimate.transcription_summary || '';
    const isHtmlDescription = /<\/?[a-z][\s\S]*>/i.test(transcriptionSummary);
    const htmlString = isHtmlDescription
        ? transcriptionSummary
        : (await remark().use(html).process(transcriptionSummary)).toString();

    // Convert line items to template format
    const templateLineItems: TemplateDescription[] = lineItems.map((item) => ({
        header: item.title,
        content: item.description,
        price: item.hours * item.rate,
        hours: item.hours,
    }));

    // Generate template
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

    // Wrap content with body-wrapper class for proper styling context
    const wrappedContent = bodyContent
        ? `<div class="body-wrapper">${bodyContent}</div>`
        : bodyContent;

    if (!wrappedContent) {
        throw new Error('Failed to extract template content');
    }

    // Combine styles and wrapped body content
    return `<style>${styles}</style>${wrappedContent}`;
}

/**
 * Place signatures in the HTML template DOM element
 */
function placeSignaturesInElement(
    element: HTMLElement,
    signatures: Signature[]
): Promise<void> {
    return new Promise((resolve) => {
        // Wait a bit for the DOM to be fully rendered
        setTimeout(() => {
            // Find signature fields and place signatures
            const signatureFields = element.querySelectorAll('signature-field');

            if (signatureFields.length === 0) {
                // eslint-disable-next-line no-console
                console.warn('No signature-field elements found in template');
                resolve();
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
                    (sig) => sig.signature_type === signatureType && sig.is_valid !== false
                );

                const signatureField = field as HTMLElement;
                // CRITICAL: Set border directly on the signature-field element
                // These styles ensure the line appears above the signature/name
                // Use setProperty with important flag to ensure it persists through PDF generation
                signatureField.style.setProperty('display', 'block', 'important');
                signatureField.style.setProperty('visibility', 'visible', 'important');
                signatureField.style.setProperty('width', '300px', 'important');
                signatureField.style.setProperty('height', '80px', 'important');
                signatureField.style.setProperty('min-height', '80px', 'important');
                signatureField.style.setProperty('border-bottom', '1px solid #333', 'important');
                signatureField.style.setProperty('border-top', 'none', 'important');
                signatureField.style.setProperty('border-left', 'none', 'important');
                signatureField.style.setProperty('border-right', 'none', 'important');
                signatureField.style.setProperty('box-sizing', 'border-box', 'important');
                signatureField.style.setProperty('position', 'relative', 'important');
                signatureField.style.setProperty('padding', '0', 'important');
                signatureField.style.setProperty('margin', '0', 'important');
                signatureField.style.setProperty('margin-bottom', '5px', 'important');
                signatureField.style.setProperty('overflow', 'visible', 'important');
                signatureField.style.setProperty('background', 'transparent', 'important');

                // Also set as attribute to ensure it's in the DOM
                signatureField.setAttribute('style', signatureField.style.cssText);

                // Set data attribute to mark this as a signature field that needs borders
                signatureField.setAttribute('data-signature-field', 'true');

                // Clear existing content
                signatureField.innerHTML = '';

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
                    img.style.maxHeight = '79px';
                    img.style.objectFit = 'contain';
                    img.style.display = 'block';
                    img.alt = signature.signer_name || 'Signature';

                    signatureField.appendChild(img);

                    // eslint-disable-next-line no-console
                    console.log(`Placed ${signatureType} signature on ${role} field`);
                } else {
                    // No signature - ensure the line is visible
                    // Add a spacer div that takes up the space
                    const spacer = document.createElement('div');
                    spacer.style.width = '100%';
                    spacer.style.height = '79px';
                    spacer.style.minHeight = '79px';
                    spacer.style.display = 'block';
                    signatureField.appendChild(spacer);

                    // The border-bottom on signatureField itself will provide the line
                    // No need for additional lineDiv that might cause rendering issues

                    // eslint-disable-next-line no-console
                    console.log(`No signature found for ${signatureType} (role: ${role}), showing empty line`);
                }
            });

            // Double-check that all signature fields have borders set
            // This ensures the lines will be visible in the PDF
            const allFields = element.querySelectorAll('signature-field');
            allFields.forEach((field) => {
                const fieldEl = field as HTMLElement;
                // Force border to be set if it's not already set with important flag
                const currentBorder = fieldEl.style.getPropertyValue('border-bottom');
                if (!currentBorder || currentBorder === 'none' || !currentBorder.includes('solid')) {
                    fieldEl.style.setProperty('border-bottom', '1px solid #333', 'important');
                    fieldEl.style.setProperty('display', 'block', 'important');
                    fieldEl.style.setProperty('height', '80px', 'important');
                    fieldEl.style.setProperty('min-height', '80px', 'important');
                }
            });

            resolve();
        }, 100); // Small delay to ensure DOM is ready
    });
}

/**
 * Generates a PDF blob from estimate data
 * This utility creates the HTML template, places signatures, and converts to PDF
 *
 * @param params - Estimate data including estimate, client, lineItems, resources, and signatures
 * @returns Promise that resolves to a Blob containing the PDF
 */
export async function generateEstimatePdf(
    params: GenerateEstimatePdfParams
): Promise<Blob> {
    const { estimate, client, lineItems, imageResources, signatures = [] } = params;
    const fullHtml = await buildEstimateTemplateHtml({
        estimate,
        client,
        lineItems,
        imageResources,
    });

    // Always include signature field styling to ensure lines appear above names
    // Signature fields are always in the template, and we need borders visible
    // when signatures exist (matching preview behavior)
    const signatureFieldStyles = signatures.length > 0 ? `
        .pdf-render-root signature-field,
        .pdf-render-root signature-field.signature-field,
        .pdf-render-root signature-field[class="signature-field"],
        .pdf-render-root .signature-field {
            display: block !important;
            visibility: visible !important;
            border-bottom: 1px solid #333 !important;
            border-top: none !important;
            border-left: none !important;
            border-right: none !important;
            width: 300px !important;
            height: 80px !important;
            min-height: 80px !important;
            box-sizing: border-box !important;
            margin-bottom: 5px !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
        }
    ` : '';

    const pdfOverrides = `
        .pdf-render-root .full-page-wrapper { display: block; }
        .pdf-render-root .container {
            width: 7.5in !important;
            max-width: 7.5in !important;
            margin: 0 auto;
            box-sizing: border-box;
            border: none !important;
            border-bottom: none !important;
        }
        .pdf-render-root .full-page-wrapper {
            border: none !important;
            border-bottom: none !important;
        }
        .pdf-render-root .container *,
        .pdf-render-root .container *::before,
        .pdf-render-root .container *::after {
            box-sizing: border-box;
        }
        .pdf-render-root .page-break { page-break-before: always; break-before: page; }
        .pdf-render-root .signature-section,
        .pdf-render-root .estimate-details,
        .pdf-render-root .notes,
        .pdf-render-root .terms,
        .pdf-render-root .trailer-notice {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .pdf-render-root .terms {
            border-bottom: none !important;
            border-top: none !important;
        }
        .pdf-render-root .estimate-body,
        .pdf-render-root .description,
        .pdf-render-root .content-headers {
            display: block;
        }
        .pdf-render-root .description,
        .pdf-render-root .estimate-body,
        .pdf-render-root .totals-wrapper {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        ${signatureFieldStyles}
        /* Additional rule to ensure signature fields have borders - targets custom element directly */
        ${signatures.length > 0 ? `
        .pdf-render-root signature-field[role="Service Provider"],
        .pdf-render-root signature-field[role="Property Owner"] {
            border-bottom: 1px solid #333 !important;
            display: block !important;
        }
        ` : ''}
        .pdf-render-root .signature-section {
            display: flex;
            justify-content: space-between;
            flex-wrap: nowrap;
            border-bottom: none !important;
            border-top: none !important;
        }
        .pdf-render-root .signature-field-wrapper {
            width: 45%;
            padding: 20px 0;
            border-bottom: none !important;
        }
        .pdf-render-root .signature-label {
            margin-top: 10px !important;
        }
        .pdf-render-root .footer {
            border-top: none !important;
            border-bottom: none !important;
            border-left: none !important;
            border-right: none !important;
        }
        /* Remove any borders from footer children */
        .pdf-render-root .footer * {
            border-bottom: none !important;
            border-top: none !important;
        }
        /* Remove border from signature-section (but keep signature-field borders) */
        .pdf-render-root .signature-section {
            border-bottom: none !important;
            border-top: none !important;
        }
        /* Remove border from signature-field-wrapper (but keep signature-field borders) */
        .pdf-render-root .signature-field-wrapper {
            border-bottom: none !important;
        }
        /* Remove border from terms section */
        .pdf-render-root .terms {
            border-bottom: none !important;
        }
    `;

    const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const templateStyles = styleMatch ? styleMatch[1] : '';
    const scopedTemplateStyles = templateStyles
        .split('}')
        .map((rule) => {
            const trimmed = rule.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('@')) {
                return `${trimmed}}`;
            }
            const parts = trimmed.split('{');
            if (parts.length < 2) return '';
            const selectors = parts[0]
                .split(',')
                .map((selector) => `.pdf-render-root ${selector.trim()}`)
                .join(', ');
            return `${selectors} {${parts.slice(1).join('{')}}`;
        })
        .join('}');
    const htmlWithoutStyles = fullHtml.replace(/<style[\s\S]*?<\/style>/i, '');

    // Create a temporary DOM element
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-10000px';
    tempContainer.style.top = '0';
    tempContainer.style.pointerEvents = 'none';
    tempContainer.style.width = '8.5in'; // Letter width
    tempContainer.style.minHeight = '11in';
    tempContainer.style.overflow = 'visible';
    tempContainer.style.background = '#fff';
    tempContainer.style.border = 'none';
    tempContainer.style.borderBottom = 'none';
    tempContainer.innerHTML = `<style>${scopedTemplateStyles}${pdfOverrides}</style><div class="pdf-render-root" style="border: none !important; border-bottom: none !important;">${htmlWithoutStyles}</div>`;
    document.body.appendChild(tempContainer);

    try {
        // Allow layout and fonts to settle before rendering
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve());
            });
        });
        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        // Only place signatures if they exist
        // If there are no signatures, don't modify the signature fields at all
        if (signatures.length > 0) {
            await placeSignaturesInElement(tempContainer, signatures);
            // Give the DOM time to apply the styles before PDF generation
            await new Promise<void>(resolve => {
                setTimeout(resolve, 50);
            });
        }

        // Wait for all images (including signature images) to load
        const images = tempContainer.querySelectorAll('img');
        const imagePromises = Array.from(images).map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Continue even if image fails
                // Timeout after 5 seconds
                setTimeout(() => resolve(), 5000);
            });
        });

        await Promise.all(imagePromises);

        // Final verification: Ensure all signature fields have visible borders
        // This is critical for the contract appearance
        if (signatures.length > 0) {
            const allSignatureFields = tempContainer.querySelectorAll('signature-field');
            allSignatureFields.forEach((field) => {
                const fieldEl = field as HTMLElement;
                // Force border to be visible - this is critical for contract appearance
                fieldEl.style.setProperty('border-bottom', '1px solid #333', 'important');
                fieldEl.style.setProperty('display', 'block', 'important');
                fieldEl.style.setProperty('visibility', 'visible', 'important');
                // Ensure the field has height so the border is visible
                if (!fieldEl.style.height || fieldEl.style.height === '0px') {
                    fieldEl.style.setProperty('height', '80px', 'important');
                    fieldEl.style.setProperty('min-height', '80px', 'important');
                }
            });
        }

        // Generate PDF from the element
        const pdfBlob = await generatePdfFromElement(tempContainer, {
            html2canvas: {
                windowWidth: tempContainer.offsetWidth,
                windowHeight: tempContainer.scrollHeight,
            },
            pagebreak: {
                mode: ['css', 'legacy'],
            },
        });
        if (pdfBlob.size < 5000) {
            return await generatePdfFromHtmlString(tempContainer.innerHTML);
        }
        return pdfBlob;
    } finally {
        // Clean up temporary element
        document.body.removeChild(tempContainer);
    }
}
