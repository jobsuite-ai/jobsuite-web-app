import html2pdf from 'html2pdf.js';

/**
 * Generates a PDF blob from an HTML element using html2pdf.js
 * Uses the same configuration as the print page for consistency
 *
 * @param element - The HTML element to convert to PDF
 * @returns Promise that resolves to a Blob containing the PDF
 */
export async function generatePdfFromElement(
    element: HTMLElement,
    options?: {
        html2canvas?: {
            width?: number;
            height?: number;
            windowWidth?: number;
            windowHeight?: number;
        };
        pagebreak?: {
            mode?: Array<'avoid-all' | 'css' | 'legacy'>;
        };
    }
): Promise<Blob> {
    // Wait for all images to load before generating PDF
    const images = element.querySelectorAll('img');
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

    // Configure PDF options (same as print page)
    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true,
            onclone: (clonedDoc: Document) => {
                // Remove bottom borders from elements that shouldn't have them
                // This runs on the cloned DOM before rendering

                // Remove borders from footer and all its descendants
                const footer = clonedDoc.querySelector('.footer');
                if (footer) {
                    const footerEl = footer as HTMLElement;
                    footerEl.style.borderBottom = 'none !important';
                    footerEl.style.borderTop = 'none !important';
                    footerEl.style.border = 'none !important';
                    footerEl.style.outline = 'none !important';
                    footerEl.style.boxShadow = 'none !important';
                    footerEl.style.marginBottom = '0';
                    footerEl.style.paddingBottom = '0';
                    // Remove borders from all children of footer
                    footerEl.querySelectorAll('*').forEach((child) => {
                        const childEl = child as HTMLElement;
                        childEl.style.borderBottom = 'none !important';
                        childEl.style.borderTop = 'none !important';
                        childEl.style.border = 'none !important';
                    });
                }

                // Remove borders from signature section
                const signatureSection = clonedDoc.querySelector('.signature-section');
                if (signatureSection) {
                    const sigSectionEl = signatureSection as HTMLElement;
                    sigSectionEl.style.borderBottom = 'none !important';
                    sigSectionEl.style.marginBottom = '0';
                }

                // Remove bottom border from signature field wrappers (but keep top border)
                const signatureFieldWrapper = clonedDoc.querySelectorAll('.signature-field-wrapper');
                signatureFieldWrapper.forEach((wrapper) => {
                    const wrapperEl = wrapper as HTMLElement;
                    wrapperEl.style.borderBottom = 'none !important';
                    // Don't remove border-top - allow template CSS to control it
                });

                // Remove borders from container and full-page-wrapper
                const container = clonedDoc.querySelector('.container');
                if (container) {
                    const containerEl = container as HTMLElement;
                    containerEl.style.borderBottom = 'none !important';
                }
                const fullPageWrapper = clonedDoc.querySelector('.full-page-wrapper');
                if (fullPageWrapper) {
                    const wrapperEl = fullPageWrapper as HTMLElement;
                    wrapperEl.style.borderBottom = 'none !important';
                }

                // Remove borders from the pdf-render-root div itself
                const pdfRoot = clonedDoc.querySelector('.pdf-render-root');
                if (pdfRoot) {
                    const rootEl = pdfRoot as HTMLElement;
                    rootEl.style.borderBottom = 'none !important';
                }

                // Aggressively remove borders from all elements except signature-field
                const allElements = clonedDoc.querySelectorAll('*');
                allElements.forEach((el) => {
                    const elHtml = el as HTMLElement;
                    // Skip signature-field elements (we want to keep those borders)
                    const isSignatureField = el.tagName.toLowerCase() === 'signature-field'
                        || el.classList.contains('signature-field');
                    if (isSignatureField) {
                        return;
                    }
                    // Skip if it's inside a signature-field (keep borders on children)
                    if (el.closest('signature-field')) {
                        return;
                    }
                    // Skip if it's the signature-field-wrapper
                    if (el.classList.contains('signature-field-wrapper')) {
                        return;
                    }
                    // Remove bottom border from everything else
                    elHtml.style.borderBottom = 'none !important';
                });

                // Ensure signature-field elements KEEP their borders
                const signatureFields = clonedDoc.querySelectorAll('signature-field');
                signatureFields.forEach((field) => {
                    const fieldEl = field as HTMLElement;
                    // Ensure signature fields have their border-bottom
                    if (!fieldEl.style.borderBottom || fieldEl.style.borderBottom === 'none') {
                        fieldEl.style.borderBottom = '1px solid #333';
                    }
                });
            },
            ...options?.html2canvas,
        },
        pagebreak: options?.pagebreak,
        jsPDF: {
            unit: 'in',
            format: 'letter',
            orientation: 'portrait' as const,
        },
    };

    // Generate PDF and return as blob
    const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
    return pdfBlob;
}

/**
 * Generates a PDF blob from an HTML string using html2pdf.js
 *
 * @param htmlString - HTML string to convert to PDF
 * @returns Promise that resolves to a Blob containing the PDF
 */
export async function generatePdfFromHtmlString(htmlString: string): Promise<Blob> {
    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true,
        },
        jsPDF: {
            unit: 'in',
            format: 'letter',
            orientation: 'portrait' as const,
        },
    };

    const pdfBlob = await html2pdf().set(opt).from(htmlString).output('blob');
    return pdfBlob;
}
