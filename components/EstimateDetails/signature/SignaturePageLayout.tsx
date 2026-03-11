'use client';

import { useCallback, useMemo, useState } from 'react';

import {
    Alert,
    AppShell,
    Box,
    Button,
    Container,
    Group,
    NavLink,
    Paper,
    Stack,
    Tabs,
    Text,
    Title,
    useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
    IconBuilding,
    IconFileText,
    IconHistory,
    IconInfoCircle,
    IconLicense,
    IconSignature,
} from '@tabler/icons-react';

import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import EstimateSignaturePreview from '@/components/EstimateDetails/signature/EstimateSignaturePreview';
import SignatureAuditHistory from '@/components/EstimateDetails/signature/SignatureAuditHistory';
import SignatureForm, { SignaturePayload } from '@/components/EstimateDetails/signature/SignatureForm';
import SignaturePageSections, {
    PastProject,
} from '@/components/EstimateDetails/signature/SignaturePageSections';
import { ContractorClient, Estimate, EstimateResource } from '@/components/Global/model';
import { logToCloudWatch } from '@/public/logger';

export interface SignatureLinkInfo {
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
        license_info?: string;
        license_pdf_url?: string;
        insurance_info?: string;
        insurance_pdf_url?: string;
        w9_pdf_url?: string;
        about_text: string;
        about_blocks?: Array<{ type: 'text' | 'image'; content?: string; image_url?: string }>;
        about_heading?: string;
        about_subheading?: string;
        past_projects_count: number;
        use_curated_past_projects?: boolean;
        past_projects_curated?: PastProject[];
    };
    past_projects?: PastProject[];
    viewer_type?: 'contractor' | 'client';
    signatures?: Array<{
        id?: string;
        signature_type: string;
        signature_data: string;
        signer_name?: string;
        signer_email: string;
        signed_at: string;
        is_valid?: boolean;
    }>;
}

interface SignaturePageLayoutProps {
    linkInfo: SignatureLinkInfo;
    signatureHash: string;
    isPreviewMode?: boolean;
    setLinkInfo?: (fn: (prev: SignatureLinkInfo | null) => SignatureLinkInfo | null) => void;
    signed?: boolean;
    setSigned?: (signed: boolean) => void;
    signatureModalOpened?: boolean;
    setSignatureModalOpened?: (opened: boolean) => void;
}

export default function SignaturePageLayout({
    linkInfo,
    signatureHash,
    isPreviewMode = false,
    setLinkInfo,
    signed = false,
    setSigned,
    signatureModalOpened = false,
    setSignatureModalOpened,
}: SignaturePageLayoutProps) {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
    const [activeTab, setActiveTab] = useState<string | null>('estimate');

    const isContractorViewer = isPreviewMode || linkInfo.viewer_type === 'contractor';

    const imageResources = useMemo(() => (linkInfo.resources || []).filter(
            (r: EstimateResource) =>
                r.resource_type === 'IMAGE' && r.upload_status === 'COMPLETED'
        ), [linkInfo]);
    const videoResources = useMemo(() => (linkInfo.resources || []).filter(
            (r: EstimateResource) =>
                r.resource_type === 'VIDEO' &&
                r.upload_status === 'COMPLETED'
        ), [linkInfo]);
    const lineItems: EstimateLineItem[] = useMemo(() => (
        linkInfo.line_items || []
    ).map((item: any) => ({
            id: item.id,
            title: item.title || '',
            description: item.description || '',
            hours: item.hours || 0,
            rate: item.rate || 0,
            created_at: item.created_at || new Date().toISOString(),
        })), [linkInfo]);

    const handleSignatureClick = useCallback(() => {
        if (!isContractorViewer && setSignatureModalOpened) {
            setSignatureModalOpened(true);
        }
    }, [isContractorViewer, setSignatureModalOpened]);

    const config = linkInfo.signature_page_config || {};
    const showDocuments =
        config.show_license === true ||
        config.show_insurance === true ||
        config.show_w9 === true;
    const availableTabs = [
        { value: 'estimate', label: 'Estimate', icon: IconFileText },
        ...(showDocuments
            ? [{ value: 'documents', label: 'Documents', icon: IconLicense }]
            : []),
        ...(config.show_about === true
            ? [{ value: 'about', label: 'About', icon: IconInfoCircle }]
            : []),
        ...(config.show_past_projects === true
            ? [{ value: 'projects', label: 'Past Projects', icon: IconBuilding }]
            : []),
        ...(isContractorViewer
            ? [{ value: 'audit', label: 'Audit History', icon: IconHistory }]
            : []),
    ];

    const renderNavigation = () => {
        if (isMobile) {
            return (
                <Box
                  style={{
                        borderBottom: '1px solid var(--mantine-color-gray-3)',
                        backgroundColor: 'var(--mantine-color-body)',
                    }}
                >
                    <Container size="xl" py="md" style={{ maxWidth: '1400px' }}>
                        {linkInfo.contractor && (
                            <Box mb="md">
                                <Title order={4}>{linkInfo.contractor.name}</Title>
                                {linkInfo.contractor.email && (
                                    <Text c="dimmed" size="xs" mt="xs">
                                        {linkInfo.contractor.email}
                                    </Text>
                                )}
                            </Box>
                        )}
                        <Tabs
                          value={activeTab || undefined}
                          onChange={(value) => setActiveTab(value)}
                        >
                            <Tabs.List style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
                                {availableTabs.map((tab) => (
                                    <Tabs.Tab
                                      key={tab.value}
                                      value={tab.value}
                                      leftSection={<tab.icon size={16} />}
                                    >
                                        {tab.label}
                                    </Tabs.Tab>
                                ))}
                            </Tabs.List>
                        </Tabs>
                    </Container>
                </Box>
            );
        }
        return (
            <AppShell.Navbar p="md">
                <Stack gap="xs">
                    {linkInfo.contractor && (
                        <Box
                          mb="md"
                          pb="md"
                          style={{
                                borderBottom: '1px solid var(--mantine-color-gray-3)',
                            }}
                        >
                            <Title order={4}>{linkInfo.contractor.name}</Title>
                            {linkInfo.contractor.email && (
                                <Text c="dimmed" size="xs" mt="xs">
                                    {linkInfo.contractor.email}
                                </Text>
                            )}
                        </Box>
                    )}
                    {availableTabs.map((tab) => (
                        <NavLink
                          key={tab.value}
                          label={tab.label}
                          leftSection={<tab.icon size={18} />}
                          active={activeTab === tab.value}
                          onClick={() => setActiveTab(tab.value)}
                          style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                        />
                    ))}
                </Stack>
            </AppShell.Navbar>
        );
    };

    const showQuickSignCta =
        !isContractorViewer &&
        !!setSignatureModalOpened &&
        !signed;

    const renderHeader = () => (
        <AppShell.Header
          style={{
                borderBottom: '1px solid var(--mantine-color-gray-3)',
                backgroundColor: 'var(--mantine-color-body)',
            }}
        >
            <Container size="xl" px="md" style={{ maxWidth: '1400px', height: '100%' }}>
                <Group
                  justify="space-between"
                  align="center"
                  h={56}
                  wrap="nowrap"
                  gap="md"
                >
                    <Title order={5} fw={600} lineClamp={1} style={{ flex: 1 }} c="dark.8">
                        {linkInfo.contractor?.name || 'Sign your estimate'}
                    </Title>
                    {showQuickSignCta ? (
                        <Button
                          size="sm"
                          leftSection={<IconSignature size={16} />}
                          onClick={handleSignatureClick}
                          variant="filled"
                          radius="md"
                          fw={600}
                        >
                            Quick Sign
                        </Button>
                    ) : signed && !isContractorViewer ? (
                        <Group gap="xs" c="dimmed">
                            <IconSignature size={18} />
                            <Text size="sm" fw={500}>
                                Signed
                            </Text>
                        </Group>
                    ) : null}
                </Group>
            </Container>
        </AppShell.Header>
    );

    return (
        <AppShell
          padding={0}
          header={{ height: 56 }}
          navbar={
                isMobile
                    ? undefined
                    : { width: 250, breakpoint: 'sm' }
            }
        >
            {renderHeader()}
            {!isMobile && renderNavigation()}
            <AppShell.Main>
                {isMobile && renderNavigation()}
                <Container size="xl" py="xl" style={{ maxWidth: '1400px' }}>
                    <Stack gap="xl">
                        {isContractorViewer && (
                            <Alert
                              icon={<IconInfoCircle size={16} />}
                              title="Preview Mode"
                              color="blue"
                              variant="light"
                            >
                                {isPreviewMode
                                    ? 'This is a preview of your signature page with the current settings. No data is saved.'
                                    : 'You are viewing this signature page as a contractor. Your access will not affect the estimate status.'}
                            </Alert>
                        )}

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
                                        This estimate has already been signed.
                                    </Alert>
                                )}
                                <Box style={{ position: 'relative' }}>
                                    <EstimateSignaturePreview
                                      estimate={linkInfo.estimate}
                                      imageResources={imageResources}
                                      videoResources={videoResources}
                                      lineItems={lineItems}
                                      client={linkInfo.client || undefined}
                                      onSignatureClick={handleSignatureClick}
                                      showSignatureClickable={
                                            !isContractorViewer && !signed
                                        }
                                      signatures={linkInfo.signatures || []}
                                    />
                                </Box>
                                {!isContractorViewer &&
                                    setLinkInfo &&
                                    setSigned &&
                                    setSignatureModalOpened && (
                                        <SignatureForm
                                          signatureHash={signatureHash}
                                          clientEmail={linkInfo.client?.email || ''}
                                          clientName={linkInfo.client?.name || undefined}
                                          onSignatureSuccess={(
                                                signature: SignaturePayload
                                            ) => {
                                                logToCloudWatch(
                                                    '[SIGNATURE_FLOW_EVENT] Signature submitted. ' +
                                                        `hash=${signatureHash}`
                                                ).catch(() => {});
                                                const sig = {
                                                    id: signature.id || `temp-${Date.now()}`,
                                                    ...signature,
                                                    signature_type:
                                                        signature.signature_type || 'CLIENT',
                                                };
                                                setSigned(true);
                                                setSignatureModalOpened(false);
                                                setLinkInfo((prev) => {
                                                    if (!prev) return prev;
                                                    const s = prev.signatures
                                                        ? [...prev.signatures]
                                                        : [];
                                                    s.push(sig);
                                                    return { ...prev, signatures: s };
                                                });
                                                const rollback = () => {
                                                    setSigned(false);
                                                    setLinkInfo((p) =>
                                                        p?.signatures
                                                            ? {
                                                                  ...p,
                                                                  signatures: p.signatures.filter(
                                                                      (x) => x.id !== sig.id
                                                                  ),
                                                              }
                                                            : p
                                                    );
                                                };
                                                const refresh = async (attempt = 1) => {
                                                    try {
                                                        const token = localStorage.getItem(
                                                            'access_token'
                                                        );
                                                        const r = await fetch(
                                                            `/api/signature/${signatureHash}`,
                                                            {
                                                                method: 'GET',
                                                                headers: token
                                                                    ? {
                                                                          Authorization: `Bearer ${token}`,
                                                                      }
                                                                    : {},
                                                            }
                                                        );
                                                        if (r.ok) setLinkInfo(await r.json());
                                                    } catch {
                                                        if (attempt < 2) {
                                                            setTimeout(
                                                                () => refresh(attempt + 1),
                                                                1500
                                                            );
                                                        }
                                                    }
                                                };
                                                refresh();
                                                return rollback;
                                            }}
                                          opened={signatureModalOpened}
                                          onClose={() =>
                                                setSignatureModalOpened(false)
                                            }
                                        />
                                    )}
                                {isContractorViewer && (
                                    <Paper shadow="sm" p="xl" radius="md" withBorder>
                                        <Text c="dimmed" ta="center">
                                            Signature form is hidden in preview mode.
                                        </Text>
                                    </Paper>
                                )}
                            </>
                        )}

                        {activeTab === 'documents' && (
                            <SignaturePageSections
                              contractor={linkInfo.contractor}
                              signaturePageConfig={{
                                    ...linkInfo.signature_page_config,
                                    show_license: config.show_license ?? false,
                                    show_insurance: config.show_insurance ?? false,
                                    show_w9: config.show_w9 ?? false,
                                    show_about: false,
                                    show_past_projects: false,
                                }}
                              signatureHash={signatureHash}
                            />
                        )}

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
                              pastProjectsOverride={
                                    config.use_curated_past_projects &&
                                    linkInfo.past_projects
                                        ? linkInfo.past_projects
                                        : undefined
                                }
                            />
                        )}

                        {activeTab === 'audit' && isContractorViewer && (
                            <SignatureAuditHistory
                              estimateId={linkInfo.estimate_id}
                            />
                        )}
                    </Stack>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
