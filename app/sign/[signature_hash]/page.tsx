'use client';

import { useEffect, useState } from 'react';

import { Alert, AppShell, Box, Center, Container, Loader, NavLink, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconFileText, IconInfoCircle, IconLicense, IconShield, IconBuilding } from '@tabler/icons-react';
import { useParams } from 'next/navigation';

import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import EstimateSignaturePreview from '@/components/EstimateDetails/signature/EstimateSignaturePreview';
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
        show_past_projects: boolean;
        show_about: boolean;
        license_info: string;
        insurance_info: string;
        about_text: string;
        past_projects_count: number;
    };
}

export default function SignaturePage() {
    const params = useParams();
    const signatureHash = params.signature_hash as string;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [linkInfo, setLinkInfo] = useState<SignatureLinkInfo | null>(null);
    const [signed, setSigned] = useState(false);
    const [activeTab, setActiveTab] = useState<string | null>('estimate');

    useEffect(() => {
        if (!signatureHash) return;

        const fetchLinkInfo = async () => {
            try {
                setLoading(true);
                setError(null);

                // Use Next.js API route as proxy
                const response = await fetch(
                    `/api/signature/${signatureHash}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
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

                // Check if already signed
                if (data.status === 'SIGNED') {
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

    if (signed) {
        return (
            <Container size="md" py="xl">
                <Paper shadow="sm" p="xl" radius="md" withBorder>
                    <Stack align="center" gap="md">
                        <Title order={2}>Thank You!</Title>
                        <Text c="dimmed" ta="center">
                            This estimate has already been signed. Thank you for your confirmation.
                        </Text>
                    </Stack>
                </Paper>
            </Container>
        );
    }

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
    const availableTabs = [
        { value: 'estimate', label: 'Estimate', icon: IconFileText },
        ...(linkInfo.signature_page_config.show_license
            ? [{ value: 'license', label: 'License', icon: IconLicense }]
            : []),
        ...(linkInfo.signature_page_config.show_insurance
            ? [{ value: 'insurance', label: 'Insurance', icon: IconShield }]
            : []),
        ...(linkInfo.signature_page_config.show_about
            ? [{ value: 'about', label: 'About', icon: IconInfoCircle }]
            : []),
        ...(linkInfo.signature_page_config.show_past_projects
            ? [{ value: 'projects', label: 'Past Projects', icon: IconBuilding }]
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
                    {/* Estimate Tab Content */}
                    {activeTab === 'estimate' && (
                      <>
                        <EstimateSignaturePreview
                          estimate={linkInfo.estimate}
                          imageResources={imageResources}
                          videoResources={videoResources}
                          lineItems={lineItems}
                          client={linkInfo.client || undefined}
                        />

                        {/* Signature Form */}
                        <SignatureForm
                          signatureHash={signatureHash}
                          clientEmail={linkInfo.client?.email || ''}
                          onSignatureSuccess={() => setSigned(true)}
                        />
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
                          show_about: false,
                          show_past_projects: true,
                        }}
                        signatureHash={signatureHash}
                      />
                    )}
                  </Stack>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
