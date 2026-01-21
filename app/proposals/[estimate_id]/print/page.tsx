'use client';

import { useEffect, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { getApiHeaders } from '@/app/utils/apiClient';
import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import LoadingState from '@/components/Global/LoadingState';
import { ContractorClient, Estimate, EstimateResource } from '@/components/Global/model';
import UniversalError from '@/components/Global/UniversalError';
import { useAuth } from '@/hooks/useAuth';
import { generateEstimatePdf } from '@/utils/estimatePdfGenerator';

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
    const [generatingPdf, setGeneratingPdf] = useState(false);

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

                // Fetch estimate details
                const detailsRes = await fetch(
                    `/api/estimates/${estimateID}/details`,
                    {
                        method: 'GET',
                        headers: getApiHeaders(),
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

    // Generate and download PDF when content is ready
    useEffect(() => {
        const shouldGeneratePdf = !loading
            && estimate
            && client
            && lineItems.length > 0
            && !generatingPdf;

        if (shouldGeneratePdf) {
            const generateAndDownloadPdf = async () => {
                try {
                    setGeneratingPdf(true);

                    // Fetch signatures
                    let signatures: Array<{
                        signature_type: string;
                        signature_data: string;
                        signer_name?: string;
                        is_valid?: boolean;
                    }> = [];

                    try {
                        const signaturesResponse = await fetch(
                            `/api/estimates/${estimateID}/signatures`,
                            {
                                method: 'GET',
                                headers: getApiHeaders(),
                            }
                        );

                        if (signaturesResponse.ok) {
                            const signaturesData = await signaturesResponse.json();
                            // Filter out invalid signatures
                            signatures = (signaturesData.signatures || []).filter(
                                (sig: any) => sig.is_valid !== false
                            ).map((sig: any) => ({
                                signature_type: sig.signature_type,
                                signature_data: sig.signature_data || '',
                                signer_name: sig.signer_name,
                                is_valid: sig.is_valid !== false,
                            }));
                        }
                    } catch (sigErr) {
                        // eslint-disable-next-line no-console
                        console.warn('Error fetching signatures for PDF:', sigErr);
                        // Continue without signatures
                    }

                    // Filter resources
                    const imageResources = resources.filter(
                        (r) => r.resource_type === 'IMAGE' && r.upload_status === 'COMPLETED'
                    );

                    // Generate PDF using the utility
                    const pdfBlob = await generateEstimatePdf({
                        estimate,
                        client,
                        lineItems,
                        imageResources,
                        signatures,
                    });

                    // Create download link and trigger download
                    const url = URL.createObjectURL(pdfBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `estimate-${estimateID}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Error generating PDF:', err);
                    setError(true);
                } finally {
                    setGeneratingPdf(false);
                }
            };

            // Small delay to ensure everything is ready
            const timer = setTimeout(() => {
                generateAndDownloadPdf();
            }, 500);
            return () => clearTimeout(timer);
        }
        return () => {};
    }, [loading, estimate, client, lineItems, resources, estimateID, generatingPdf]);

    if (isLoading || loading || generatingPdf) {
        return (
            <>
                <LoadingState />
                {generatingPdf && (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <p>Generating PDF...</p>
                    </div>
                )}
            </>
        );
    }

    if (error || !estimate || !client) {
        return <UniversalError message="Unable to load estimate for printing" />;
    }

    // This page should automatically download the PDF, so we don't need to render anything
    // If we reach here, the PDF should have been generated and downloaded
    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>PDF download should have started automatically.</p>
            <p>If it didn&apos;t, please check your browser&apos;s download settings.</p>
        </div>
    );
}
