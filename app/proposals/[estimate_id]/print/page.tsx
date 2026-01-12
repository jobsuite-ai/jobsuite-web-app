'use client';

import { useEffect, useRef, useState } from 'react';

import html2pdf from 'html2pdf.js';
import { useParams, useRouter } from 'next/navigation';

import EstimatePreview from '@/components/EstimateDetails/estimate/EstimatePreview';
import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import LoadingState from '@/components/Global/LoadingState';
import { ContractorClient, Estimate, EstimateResource } from '@/components/Global/model';
import UniversalError from '@/components/Global/UniversalError';
import { useAuth } from '@/hooks/useAuth';

export default function PrintEstimate() {
    const params = useParams();
    const estimateID = params?.estimate_id as string;
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [resources, setResources] = useState<EstimateResource[]>([]);
    const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
    const [client, setClient] = useState<ContractorClient | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [pdfGenerated, setPdfGenerated] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/');
            return;
        }

        if (!estimateID || isLoading) {
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(false);
                const accessToken = localStorage.getItem('access_token');

                if (!accessToken) {
                    setError(true);
                    setLoading(false);
                    return;
                }

                // Fetch estimate details
                const detailsRes = await fetch(
                    `/api/estimates/${estimateID}/details`,
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!detailsRes.ok) {
                    setError(true);
                    setLoading(false);
                    return;
                }

                const detailsData = await detailsRes.json();

                // Process estimate
                if (detailsData.estimate) {
                    setEstimate(detailsData.estimate);
                }

                // Process client
                if (detailsData.client) {
                    setClient(detailsData.client);
                }

                // Process resources
                if (detailsData.resources && Array.isArray(detailsData.resources)) {
                    setResources(detailsData.resources);
                }

                // Process line items
                if (detailsData.line_items && Array.isArray(detailsData.line_items)) {
                    setLineItems(detailsData.line_items);
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Error fetching estimate data for print:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [estimateID, isAuthenticated, isLoading, router]);

    // Generate PDF when content is ready
    useEffect(() => {
        const shouldGeneratePdf = !loading
            && estimate
            && client
            && lineItems.length > 0
            && !pdfGenerated
            && printRef.current;

        if (shouldGeneratePdf) {
            // Wait for images and content to fully load
            const timer = setTimeout(async () => {
                const element = printRef.current;
                if (!element) return;

                // Wait for all images to load
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

                // Configure PDF options
                const opt = {
                    margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
                    filename: `estimate-${estimateID}.pdf`,
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

                try {
                    await html2pdf().set(opt).from(element).save();
                    setPdfGenerated(true);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Error generating PDF:', err);
                    // Fallback to browser print if PDF generation fails
                    window.print();
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
        return () => {};
    }, [loading, estimate, client, lineItems, pdfGenerated, estimateID]);

    if (isLoading || loading) {
        return <LoadingState />;
    }

    if (error || !estimate || !client) {
        return <UniversalError message="Unable to load estimate for printing" />;
    }

    const imageResources = resources.filter(
        (r) => r.resource_type === 'IMAGE' && r.upload_status === 'COMPLETED'
    );
    const videoResources = resources.filter(
        (r) => r.resource_type === 'VIDEO' && r.upload_status === 'COMPLETED'
    );

    return (
        <>
            <style>{`
                body {
                    margin: 0;
                    padding: 0;
                    background: white;
                }
                /* Hide navigation and other non-print elements */
                nav, header, footer, button, .no-print {
                    display: none !important;
                }
                /* Ensure content fits on page */
                * {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                /* PDF generation container */
                .pdf-container {
                    background: white;
                    padding: 0;
                    margin: 0;
                }
            `}
            </style>
            <div ref={printRef} className="pdf-container">
                <EstimatePreview
                  estimate={estimate}
                  imageResources={imageResources}
                  videoResources={videoResources}
                  lineItems={lineItems}
                  client={client}
                  hideTodo
                />
            </div>
        </>
    );
}
