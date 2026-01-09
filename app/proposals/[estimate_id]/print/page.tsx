'use client';

import { useEffect, useState } from 'react';

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

    // Trigger print dialog when page loads
    useEffect(() => {
        if (!loading && estimate && client && lineItems.length > 0) {
            // Small delay to ensure content is rendered
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        } return () => {};
    }, [loading, estimate, client, lineItems]);

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
                @media print {
                    @page {
                        margin: 0.5in;
                    }
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
                }
                @media screen {
                    body {
                        background: white;
                    }
                }
            `}
            </style>
            <div style={{ padding: '20px' }}>
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
