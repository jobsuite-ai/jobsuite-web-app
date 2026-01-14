import { remark } from 'remark';
import html from 'remark-html';
import { v4 as uuidv4 } from 'uuid';

import { generatePdfFromElement } from './pdfGenerator';

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
    const fullHtml = `<style>${styles}</style>${wrappedContent}`;

    // Create a temporary DOM element
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '8.5in'; // Letter width
    tempContainer.innerHTML = fullHtml;
    document.body.appendChild(tempContainer);

    try {
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
        const pdfBlob = await generatePdfFromElement(tempContainer);
        return pdfBlob;
    } finally {
        // Clean up temporary element
        document.body.removeChild(tempContainer);
    }
}
