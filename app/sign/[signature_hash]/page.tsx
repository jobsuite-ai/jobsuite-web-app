'use client';

import { useEffect, useState } from 'react';

import { Alert, AppShell, Box, Center, Container, Loader, NavLink, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconFileText, IconHistory, IconInfoCircle, IconLicense, IconShield, IconBuilding, IconFileInvoice } from '@tabler/icons-react';
import { useParams } from 'next/navigation';

import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import EstimateSignaturePreview from '@/components/EstimateDetails/signature/EstimateSignaturePreview';
import SignatureAuditHistory from '@/components/EstimateDetails/signature/SignatureAuditHistory';
import SignatureForm from '@/components/EstimateDetails/signature/SignatureForm';
import SignaturePageSections from '@/components/EstimateDetails/signature/SignaturePageSections';
import { ContractorClient, Estimate, EstimateResource } from '@/components/Global/model';

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

    const imageResources = linkInfo.resources.filter(
        (r) => r.resource_type === 'IMAGE' && r.upload_status === 'COMPLETED'
    );
    const videoResources = linkInfo.resources.filter(
        (r) => r.resource_type === 'VIDEO' && r.upload_status === 'COMPLETED'
    );
    const lineItems: EstimateLineItem[] = linkInfo.line_items.map((item) => ({
        id: item.id,
        title: item.title || '',
        description: item.description || '',
        hours: item.hours || 0,
        rate: item.rate || 0,
        created_at: item.created_at || new Date().toISOString(),
    }));

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
                        <EstimateSignaturePreview
                          estimate={linkInfo.estimate}
                          imageResources={imageResources}
                          videoResources={videoResources}
                          lineItems={lineItems}
                          client={linkInfo.client || undefined}
                          onSignatureClick={() => {
                            if (!isContractorViewer) {
                              setSignatureModalOpened(true);
                            }
                          }}
                          showSignatureClickable={!isContractorViewer && !signed}
                          signatures={linkInfo.signatures || []}
                        />

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
