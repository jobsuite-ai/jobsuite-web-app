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
function getImagePath(
    estimate: Estimate,
    imageResources: EstimateResource[]
): string {
    if (!imageResources || imageResources.length === 0) {
        return '';
    }

    // Determine region based on branch
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
}

export async function buildEstimateTemplateHtml(
    params: BuildEstimateTemplateParams
): Promise<string> {
    const { estimate, client, lineItems, imageResources } = params;

    // Process transcription summary to HTML
    const result = await remark().use(html).process(estimate.transcription_summary || '');
    const htmlString = result.toString();

    // Convert line items to template format
    const templateLineItems: TemplateDescription[] = lineItems.map((item) => ({
        header: item.title,
        content: item.description,
        price: item.hours * item.rate,
        hours: item.hours,
    }));

    const imagePath = getImagePath(estimate, imageResources);

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

                    // Clear the field and add the signature image + explicit line
                    const signatureField = field as HTMLElement;
                    signatureField.innerHTML = '';
                    signatureField.style.display = 'block';
                    signatureField.style.width = '300px';
                    signatureField.style.height = '80px';
                    signatureField.appendChild(img);

                    const line = document.createElement('div');
                    line.style.borderBottom = '1px solid #333';
                    line.style.marginTop = '-10px';
                    line.style.width = '100%';
                    signatureField.appendChild(line);

                    // eslint-disable-next-line no-console
                    console.log(`Placed ${signatureType} signature on ${role} field`);
                } else {
                    // eslint-disable-next-line no-console
                    console.log(`No signature found for ${signatureType} (role: ${role})`);
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
    const pdfOverrides = `
        .pdf-render-root .full-page-wrapper { display: block; }
        .pdf-render-root .container {
            width: 7.5in !important;
            max-width: 7.5in !important;
            margin: 0 auto;
            box-sizing: border-box;
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
        .pdf-render-root .terms {
            page-break-inside: avoid;
            break-inside: avoid;
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
        .pdf-render-root signature-field.signature-field {
            display: block;
            border-bottom: 1px solid #333;
            width: 300px;
            height: 80px;
            background-image: linear-gradient(#333, #333);
            background-repeat: no-repeat;
            background-position: bottom left;
            background-size: 100% 1px;
        }
        .pdf-render-root .signature-section {
            display: flex;
            justify-content: space-between;
            flex-wrap: nowrap;
        }
        .pdf-render-root .signature-field-wrapper {
            width: 45%;
            padding: 20px 0;
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
    tempContainer.innerHTML = `<style>${scopedTemplateStyles}${pdfOverrides}</style><div class="pdf-render-root">${htmlWithoutStyles}</div>`;
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

        // Place signatures if provided
        if (signatures.length > 0) {
            await placeSignaturesInElement(tempContainer, signatures);
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
