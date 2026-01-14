import html2pdf from 'html2pdf.js';

/**
 * Generates a PDF blob from an HTML element using html2pdf.js
 * Uses the same configuration as the print page for consistency
 *
 * @param element - The HTML element to convert to PDF
 * @returns Promise that resolves to a Blob containing the PDF
 */
export async function generatePdfFromElement(element: HTMLElement): Promise<Blob> {
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
        },
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
