'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ActionIcon, Alert, AppShell, Box, Center, Container, Loader, NavLink, Paper, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconFileText, IconHistory, IconInfoCircle, IconLicense, IconPrinter, IconShield, IconBuilding, IconFileInvoice } from '@tabler/icons-react';
import { useParams } from 'next/navigation';

import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import EstimateSignaturePreview from '@/components/EstimateDetails/signature/EstimateSignaturePreview';
import SignatureAuditHistory from '@/components/EstimateDetails/signature/SignatureAuditHistory';
import SignatureForm from '@/components/EstimateDetails/signature/SignatureForm';
import SignaturePageSections from '@/components/EstimateDetails/signature/SignaturePageSections';
import { ContractorClient, Estimate, EstimateResource } from '@/components/Global/model';
import { buildEstimateTemplateHtml } from '@/utils/estimatePdfGenerator';
import { uploadPdfFromSignature } from '@/utils/signaturePdfUpload';

interface SignatureLinkInfo {
    signature_hash: string;
    estimate_id: string;
    status: string;
    expires_at: string;
    estimate: Estimate;
    line_items: any[];
    resources: EstimateResource[];
    contractor: any;
    client: ContractorClient | null;
    signature_page_config: {
        show_license: boolean;
        show_insurance: boolean;
        show_w9: boolean;
        show_past_projects: boolean;
        show_about: boolean;
        license_info: string;
        insurance_info: string;
        about_text: string;
        past_projects_count: number;
    };
    viewer_type?: 'contractor' | 'client';
    signatures?: Array<{
        signature_type: string;
        signature_data: string;
        signer_name?: string;
        signer_email: string;
        signed_at: string;
        is_valid?: boolean;
    }>;
}

export default function SignaturePage() {
    const params = useParams();
    const signatureHash = params.signature_hash as string;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [linkInfo, setLinkInfo] = useState<SignatureLinkInfo | null>(null);
    const [signed, setSigned] = useState(false);
    const [activeTab, setActiveTab] = useState<string | null>('estimate');
    const [isContractorViewer, setIsContractorViewer] = useState(false);
    const [signatureModalOpened, setSignatureModalOpened] = useState(false);
    const [pdfUploading, setPdfUploading] = useState(false);

    useEffect(() => {
        if (!signatureHash) return;

        const fetchLinkInfo = async () => {
            try {
                setLoading(true);
                setError(null);

                // Check if user is authenticated (contractor)
                const accessToken = localStorage.getItem('access_token');
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                };
                if (accessToken) {
                    headers.Authorization = `Bearer ${accessToken}`;
                }

                // Use Next.js API route as proxy
                // Note: The backend returns locked estimate data (estimate, line_items,
                // resources, client, signature_page_config) that was stored when the
                // estimate was sent for signing. This ensures the signed document doesn't change
                // even if the estimate is edited later. The only way to change it is to resend
                // the estimate.
                const response = await fetch(
                    `/api/signature/${signatureHash}`,
                    {
                        method: 'GET',
                        headers,
                    }
                );

                if (!response.ok) {
                    if (response.status === 404) {
                        setError('This signature link is invalid or has expired.');
                    } else {
                        setError('Failed to load signature page. Please try again later.');
                    }
                    return;
                }

                const data = await response.json();
                // Data contains locked estimate content that was stored when the estimate
                // was sent for signing
                setLinkInfo(data);

                // Check if viewer is contractor
                setIsContractorViewer(data.viewer_type === 'contractor' || data.is_contractor_viewer === true);

                // Check if already signed - only if link status is SIGNED and there are
                // valid signature. Don't treat as signed if link is REVOKED (estimate was
                // re-sent) or if there are no valid signatures
                const hasValidSignatures = data.signatures && data.signatures.length > 0;
                const isLinkSigned = data.status === 'SIGNED';
                const isLinkRevoked = data.status === 'REVOKED';
                if (!isLinkRevoked && isLinkSigned && hasValidSignatures) {
                    setSigned(true);
                }
            } catch (err: any) {
                // eslint-disable-next-line no-console
                console.error('Error fetching signature link info:', err);
                const errorMessage = err.message || 'An error occurred while loading the signature page.';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchLinkInfo();
    }, [signatureHash]);

    const imageResources = useMemo(() => {
        if (!linkInfo) return [];
        return linkInfo.resources.filter(
            (r) => r.resource_type === 'IMAGE' && r.upload_status === 'COMPLETED'
        );
    }, [linkInfo]);
    const videoResources = useMemo(() => {
        if (!linkInfo) return [];
        return linkInfo.resources.filter(
            (r) => r.resource_type === 'VIDEO' && r.upload_status === 'COMPLETED'
        );
    }, [linkInfo]);
    const lineItems: EstimateLineItem[] = useMemo(() => {
        if (!linkInfo) return [];
        return linkInfo.line_items.map((item) => ({
            id: item.id,
            title: item.title || '',
            description: item.description || '',
            hours: item.hours || 0,
            rate: item.rate || 0,
            created_at: item.created_at || new Date().toISOString(),
        }));
    }, [linkInfo]);
    const handleSignatureClick = useCallback(() => {
        if (!isContractorViewer) {
            setSignatureModalOpened(true);
        }
    }, [isContractorViewer]);

    if (loading) {
        return (
            <Center style={{ minHeight: '100vh' }}>
                <Stack align="center" gap="md">
                    <Loader size="xl" />
                    <Text c="dimmed">Loading signature page...</Text>
                </Stack>
            </Center>
        );
    }

    if (error) {
        return (
            <Container size="md" py="xl">
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="Error"
                  color="red"
                  variant="light"
                >
                    {error}
                </Alert>
            </Container>
        );
    }

    if (!linkInfo) {
        return null;
    }

    // Don't return early if signed - show the estimate with signatures instead

    // Don't return early if signed - show the estimate with signatures instead

    // Build available tabs based on configuration
    // Ensure signature_page_config has defaults to handle cases where config might be empty
    const config = linkInfo.signature_page_config || {};
    const availableTabs = [
        { value: 'estimate', label: 'Estimate', icon: IconFileText },
        ...(config.show_license === true
            ? [{ value: 'license', label: 'License', icon: IconLicense }]
            : []),
        ...(config.show_insurance === true
            ? [{ value: 'insurance', label: 'Insurance', icon: IconShield }]
            : []),
        ...(config.show_w9 === true
            ? [{ value: 'w9', label: 'W9', icon: IconFileInvoice }]
            : []),
        ...(config.show_about === true
            ? [{ value: 'about', label: 'About', icon: IconInfoCircle }]
            : []),
        ...(config.show_past_projects === true
            ? [{ value: 'projects', label: 'Past Projects', icon: IconBuilding }]
            : []),
        // Audit History tab - only visible to contractors
        ...(isContractorViewer
            ? [{ value: 'audit', label: 'Audit History', icon: IconHistory }]
            : []),
    ];

    // Set initial tab if estimate tab doesn't exist (shouldn't happen, but safety check)
    if (activeTab === null && availableTabs.length > 0) {
        setActiveTab(availableTabs[0].value);
    }

    const buildPdfBlob = async (sourceInfo: SignatureLinkInfo): Promise<Blob> => {
        if (!sourceInfo.client) {
            throw new Error('Client information is required to generate the PDF.');
        }

        const pdfLineItems: EstimateLineItem[] = (sourceInfo.line_items || []).map((item) => ({
            id: item.id,
            title: item.title || '',
            description: item.description || '',
            hours: item.hours || 0,
            rate: item.rate || 0,
            created_at: item.created_at || new Date().toISOString(),
        }));

        const pdfImageResources = sourceInfo.resources.filter(
            (r) => r.resource_type === 'IMAGE' && r.upload_status === 'COMPLETED'
        );

        const pdfSignatures = (sourceInfo.signatures || [])
            .filter((sig) => sig.is_valid !== false)
            .map((sig) => ({
                signature_type: sig.signature_type,
                signature_data: sig.signature_data || '',
                signer_name: sig.signer_name,
                is_valid: sig.is_valid !== false,
            }));

        // Import generateEstimatePdf dynamically to avoid loading it unless needed
        const { generateEstimatePdf } = await import('@/utils/estimatePdfGenerator');
        return generateEstimatePdf({
            estimate: sourceInfo.estimate,
            client: sourceInfo.client,
            lineItems: pdfLineItems,
            imageResources: pdfImageResources,
            signatures: pdfSignatures,
        });
    };

    const handlePrint = async () => {
        if (!linkInfo || !linkInfo.client || lineItems.length === 0) {
            notifications.show({
                title: 'Error',
                message: 'Unable to print: Missing required data',
                color: 'red',
                position: 'top-center',
            });
            return;
        }

        try {
            // Prepare signatures for print
            const pdfSignatures = (linkInfo.signatures || [])
                .filter((sig) => sig.is_valid !== false)
                .map((sig) => ({
                    signature_type: sig.signature_type,
                    signature_data: sig.signature_data || '',
                    signer_name: sig.signer_name,
                    is_valid: sig.is_valid !== false,
                }));

            // Build the template HTML (same as preview)
            const fullHtml = await buildEstimateTemplateHtml({
                estimate: linkInfo.estimate,
                client: linkInfo.client,
                lineItems,
                imageResources,
            });

            // Extract styles and body content
            const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
            const styles = styleMatch ? styleMatch[1] : '';
            const htmlWithoutStyles = fullHtml.replace(/<style[\s\S]*?<\/style>/i, '');

            // Create a new tab with just the estimate content
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                notifications.show({
                    title: 'Error',
                    message: 'Please allow popups to print the estimate',
                    color: 'red',
                    position: 'top-center',
                });
                return;
            }

            // Write the HTML with print-specific styles
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Estimate ${linkInfo.estimate_id}</title>
                    <style>
                        ${styles}
                        /* Print-specific styles - minimize page margins to account for browser headers/footers */
                        @page {
                            margin: 0;
                            size: letter;
                        }
                        @media print {
                            /* Remove body margins and padding */
                            body {
                                margin: 0 !important;
                                padding: 0.5in !important;
                                box-sizing: border-box !important;
                            }
                            /* Ensure container uses available width and is centered */
                            .container {
                                margin: 0 auto !important;
                                max-width: 100% !important;
                                width: 100% !important;
                                padding: 40px !important;
                                box-sizing: border-box !important;
                            }
                            /* Hide any potential header/footer elements in content */
                            header, footer, .header, .footer {
                                display: none !important;
                            }
                            /* Prevent overflow and ensure proper sizing */
                            html, body {
                                width: 100% !important;
                                overflow: visible !important;
                                box-sizing: border-box !important;
                            }
                            * {
                                box-sizing: border-box !important;
                            }
                        }
                        /* Ensure signature fields have visible borders */
                        signature-field,
                        signature-field.signature-field,
                        .signature-field {
                            display: block !important;
                            border-bottom: 1px solid #333 !important;
                            width: 300px !important;
                            height: 80px !important;
                            min-height: 80px !important;
                            box-sizing: border-box !important;
                            margin-bottom: 5px !important;
                        }
                        body {
                            margin: 0;
                            padding: 20px;
                            font-family: Helvetica Neue, Helvetica, Arial, sans-serif;
                        }
                    </style>
                </head>
                <body>
                    ${htmlWithoutStyles}
                </body>
                </html>
            `);
            printWindow.document.close();

            // Wait for content to load, then place signatures and print
            const placeSignaturesAndPrint = () => {
                // Place signatures in the print window
                if (pdfSignatures.length > 0) {
                    const signatureFields = printWindow.document.querySelectorAll('signature-field');
                    signatureFields.forEach((field) => {
                        const role = field.getAttribute('role');
                        if (!role) return;

                        let signatureType: string | null = null;
                        if (role === 'Service Provider') {
                            signatureType = 'CONTRACTOR';
                        } else if (role === 'Property Owner') {
                            signatureType = 'CLIENT';
                        }

                        if (!signatureType) return;

                        const signature = pdfSignatures.find(
                            (sig) => sig.signature_type === signatureType && sig.is_valid !== false
                        );

                        const signatureField = field as HTMLElement;
                        signatureField.style.borderBottom = '1px solid #333';
                        signatureField.style.display = 'block';
                        signatureField.style.width = '300px';
                        signatureField.style.height = '80px';
                        signatureField.style.minHeight = '80px';
                        signatureField.style.boxSizing = 'border-box';

                        if (signature && signature.signature_data) {
                            let signatureDataUrl = signature.signature_data;
                            if (!signatureDataUrl.startsWith('data:')) {
                                signatureDataUrl = `data:image/png;base64,${signatureDataUrl}`;
                            }

                            const img = printWindow.document.createElement('img');
                            img.src = signatureDataUrl;
                            img.style.width = '100%';
                            img.style.height = 'auto';
                            img.style.maxHeight = '80px';
                            img.style.objectFit = 'contain';
                            img.style.display = 'block';

                            signatureField.innerHTML = '';
                            signatureField.appendChild(img);
                        } else {
                            const spacer = printWindow.document.createElement('div');
                            spacer.style.width = '100%';
                            spacer.style.height = '79px';
                            spacer.style.minHeight = '79px';
                            spacer.style.display = 'block';
                            signatureField.innerHTML = '';
                            signatureField.appendChild(spacer);
                        }
                    });
                }

                // Wait for images to load, then print
                const images = printWindow.document.querySelectorAll('img');
                const imagePromises = Array.from(images).map((img) => {
                    if (img.complete) return Promise.resolve();
                    return new Promise<void>((resolve) => {
                        img.onload = () => resolve();
                        img.onerror = () => resolve();
                        setTimeout(() => resolve(), 2000);
                    });
                });

                Promise.all(imagePromises).then(() => {
                    setTimeout(() => {
                        // Focus the print window and print
                        printWindow.focus();
                        printWindow.print();

                        // Close the print window after a delay to free up resources
                        setTimeout(() => {
                            try {
                                if (printWindow && !printWindow.closed) {
                                    printWindow.close();
                                }
                            } catch (e) {
                                // Window might already be closed, ignore
                            }
                            // Refocus the parent window
                            window.focus();
                        }, 3000);
                    }, 300);
                });
            };

            // Use both onload and a timeout as fallback
            if (printWindow.document.readyState === 'complete') {
                setTimeout(placeSignaturesAndPrint, 100);
            } else {
                printWindow.onload = () => {
                    setTimeout(placeSignaturesAndPrint, 100);
                };
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error preparing print:', err);
            notifications.show({
                title: 'Error',
                message: 'Failed to prepare print. Please try again.',
                color: 'red',
                position: 'top-center',
            });
        }
    };

    return (
        <AppShell
          padding={0}
          navbar={{
            width: 250,
            breakpoint: 'sm',
          }}
        >
            <AppShell.Navbar p="md">
                <Stack gap="xs">
                  {/* Contractor Header */}
                  {linkInfo.contractor && (
                    <Box mb="md" pb="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                      <Title order={4}>{linkInfo.contractor.name}</Title>
                      {linkInfo.contractor.email && (
                        <Text c="dimmed" size="xs" mt="xs">
                          {linkInfo.contractor.email}
                        </Text>
                      )}
                    </Box>
                  )}

                  {/* Navigation Tabs */}
                  {availableTabs.map((tab) => (
                    <NavLink
                      key={tab.value}
                      label={tab.label}
                      leftSection={<tab.icon size={18} />}
                      active={activeTab === tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      style={{
                        borderRadius: 'var(--mantine-radius-sm)',
                      }}
                    />
                  ))}
                </Stack>
            </AppShell.Navbar>

            <AppShell.Main>
                <Container size="lg" py="xl">
                  <Stack gap="xl">
                    {/* Preview Mode Banner for Contractors */}
                    {isContractorViewer && (
                      <Alert
                        icon={<IconInfoCircle size={16} />}
                        title="Preview Mode"
                        color="blue"
                        variant="light"
                      >
                        You are viewing this signature page as a contractor.
                        Your access will not affect the estimate status.
                      </Alert>
                    )}

                    {/* Estimate Tab Content */}
                    {activeTab === 'estimate' && (
                      <>
                        {signed && (
                          <Alert
                            icon={<IconInfoCircle size={16} />}
                            title="Thank You!"
                            color="green"
                            variant="light"
                            mb="xl"
                          >
                            This estimate has already been signed. Thank you for your confirmation.
                          </Alert>
                        )}
                        {pdfUploading && (
                          <Alert
                            icon={<IconInfoCircle size={16} />}
                            title="Uploading PDF"
                            color="blue"
                            variant="light"
                            mb="xl"
                          >
                            Generating and uploading the signed estimate PDF...
                          </Alert>
                        )}
                        <Box style={{ position: 'relative' }}>
                          {/* Print Button - Show when signed or when contractor is viewing */}
                          {(signed || isContractorViewer) && (
                            <Box style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
                              <ActionIcon
                                variant="subtle"
                                onClick={handlePrint}
                                title="Print Estimate"
                                size="xl"
                              >
                                <IconPrinter size={24} />
                              </ActionIcon>
                            </Box>
                          )}
                          <EstimateSignaturePreview
                            estimate={linkInfo.estimate}
                            imageResources={imageResources}
                            videoResources={videoResources}
                            lineItems={lineItems}
                            client={linkInfo.client || undefined}
                            onSignatureClick={handleSignatureClick}
                            showSignatureClickable={!isContractorViewer && !signed}
                            signatures={linkInfo.signatures || []}
                          />
                        </Box>

                        {/* Signature Form Modal - Hide for contractors in preview mode */}
                        {!isContractorViewer && (
                          <SignatureForm
                            signatureHash={signatureHash}
                            clientEmail={linkInfo.client?.email || ''}
                            onSignatureSuccess={async () => {
                              setSigned(true);
                              setSignatureModalOpened(false);
                              // Refresh linkInfo to get updated signatures
                              try {
                                const accessToken = localStorage.getItem('access_token');
                                const headers: Record<string, string> = {
                                  'Content-Type': 'application/json',
                                };
                                if (accessToken) {
                                  headers.Authorization = `Bearer ${accessToken}`;
                                }
                                const response = await fetch(
                                  `/api/signature/${signatureHash}`,
                                  {
                                    method: 'GET',
                                    headers,
                                  }
                                );
                                if (response.ok) {
                                  const data = await response.json();
                                  setLinkInfo(data);

                                  // Check if both parties have signed
                                  const signatures = data.signatures || [];
                                  const hasClientSignature = signatures.some(
                                    (sig: any) => sig.signature_type === 'CLIENT' && sig.is_valid !== false
                                  );
                                  const hasContractorSignature = signatures.some(
                                    (sig: any) => sig.signature_type === 'CONTRACTOR' && sig.is_valid !== false
                                  );

                                  // If both parties have signed, generate and upload PDF
                                  if (hasClientSignature && hasContractorSignature) {
                                    // Wait a bit for DOM to update with signatures
                                    setTimeout(async () => {
                                      try {
                                        setPdfUploading(true);
                                        const pdfBlob = await buildPdfBlob(data);

                                        // Upload PDF
                                        await uploadPdfFromSignature(signatureHash, pdfBlob);
                                        // eslint-disable-next-line no-console
                                        console.log('PDF uploaded successfully');
                                      } catch (err) {
                                        // eslint-disable-next-line no-console
                                        console.error('Error generating or uploading PDF:', err);
                                        // Don't show error to user - PDF generation is not critical
                                      } finally {
                                        setPdfUploading(false);
                                      }
                                    }, 2000); // Wait 2 seconds for signatures to render
                                  }
                                }
                              } catch (err) {
                                // eslint-disable-next-line no-console
                                console.error('Error refreshing signature info:', err);
                              }
                            }}
                            opened={signatureModalOpened}
                            onClose={() => setSignatureModalOpened(false)}
                          />
                        )}
                        {isContractorViewer && (
                          <Paper shadow="sm" p="xl" radius="md" withBorder>
                            <Text c="dimmed" ta="center">
                              Signature form is hidden in preview mode.
                              Clients will see a clickable section above
                              their name to sign the estimate.
                            </Text>
                          </Paper>
                        )}
                      </>
                    )}

                    {/* License Tab Content */}
                    {activeTab === 'license' && (
                      <SignaturePageSections
                        contractor={linkInfo.contractor}
                        signaturePageConfig={{
                          ...linkInfo.signature_page_config,
                          show_license: true,
                          show_insurance: false,
                          show_w9: false,
                          show_about: false,
                          show_past_projects: false,
                        }}
                        signatureHash={signatureHash}
                      />
                    )}

                    {/* Insurance Tab Content */}
                    {activeTab === 'insurance' && (
                      <SignaturePageSections
                        contractor={linkInfo.contractor}
                        signaturePageConfig={{
                          ...linkInfo.signature_page_config,
                          show_license: false,
                          show_insurance: true,
                          show_w9: false,
                          show_about: false,
                          show_past_projects: false,
                        }}
                        signatureHash={signatureHash}
                      />
                    )}

                    {/* W9 Tab Content */}
                    {activeTab === 'w9' && (
                      <SignaturePageSections
                        contractor={linkInfo.contractor}
                        signaturePageConfig={{
                          ...linkInfo.signature_page_config,
                          show_license: false,
                          show_insurance: false,
                          show_w9: true,
                          show_about: false,
                          show_past_projects: false,
                        }}
                        signatureHash={signatureHash}
                      />
                    )}

                    {/* About Tab Content */}
                    {activeTab === 'about' && (
                      <SignaturePageSections
                        contractor={linkInfo.contractor}
                        signaturePageConfig={{
                          ...linkInfo.signature_page_config,
                          show_license: false,
                          show_insurance: false,
                          show_w9: false,
                          show_about: true,
                          show_past_projects: false,
                        }}
                        signatureHash={signatureHash}
                      />
                    )}

                    {/* Past Projects Tab Content */}
                    {activeTab === 'projects' && (
                      <SignaturePageSections
                        contractor={linkInfo.contractor}
                        signaturePageConfig={{
                          ...linkInfo.signature_page_config,
                          show_license: false,
                          show_insurance: false,
                          show_w9: false,
                          show_about: false,
                          show_past_projects: true,
                        }}
                        signatureHash={signatureHash}
                      />
                    )}

                    {/* Audit History Tab Content - Only visible to contractors */}
                    {activeTab === 'audit' && isContractorViewer && (
                      <SignatureAuditHistory estimateId={linkInfo.estimate_id} />
                    )}
                  </Stack>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
