'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    Alert,
    AppShell,
    Box,
    Burger,
    Button,
    Container,
    Drawer,
    Group,
    Modal,
    NavLink,
    Paper,
    Stack,
    Text,
    Title,
    useMantineTheme,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
    IconBuilding,
    IconCreditCard,
    IconFileText,
    IconHistory,
    IconInfoCircle,
    IconLicense,
    IconSignature,
} from '@tabler/icons-react';

import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import { DepositSection } from '@/components/EstimateDetails/signature/DepositSection';
import EstimateSignaturePreview from '@/components/EstimateDetails/signature/EstimateSignaturePreview';
import SignatureAuditHistory from '@/components/EstimateDetails/signature/SignatureAuditHistory';
import SignatureForm, { SignaturePayload } from '@/components/EstimateDetails/signature/SignatureForm';
import SignaturePageSections, {
    PastProject,
} from '@/components/EstimateDetails/signature/SignaturePageSections';
import { ContractorClient, Estimate, EstimateResource } from '@/components/Global/model';
import { logToCloudWatch } from '@/public/logger';

/** Live payment totals from the API (aligned with Helcim checkout-session rules). */
export interface PaymentSummary {
    invoice_total: number;
    deposit_amount: number;
    balance_amount: number;
    deposit_paid: boolean;
    deposit_paid_at?: string | null;
    fully_paid: boolean;
    payment_received_at?: string | null;
    amount_due_now: number;
    amount_paid_so_far: number;
}

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
        about_blocks?: Array<{
            type: 'text' | 'image';
            content?: string;
            image_url?: string;
            size?: 'small' | 'medium' | 'large' | 'full';
            wrap?: 'none' | 'left' | 'right';
        }>;
        about_heading?: string;
        about_subheading?: string;
        past_projects_count: number;
        use_curated_past_projects?: boolean;
        past_projects_curated?: PastProject[];
    };
    past_projects?: PastProject[];
    viewer_type?: 'contractor' | 'client';
    estimate_total?: number;
    deposit_amount?: number;
    helcim_configured?: boolean;
    payment_summary?: PaymentSummary;
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
    /** From `?pay=balance` or `?pay=deposit` on the sign URL (e.g. invoice email). */
    payIntent?: 'balance' | 'deposit' | null;
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
    payIntent = null,
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
    const [depositModalOpened, setDepositModalOpened] = useState(false);
    const [depositPaidThisSession, setDepositPaidThisSession] = useState(false);
    const initialPaidTabRedirectRef = useRef(false);

    const refreshLinkInfo = useCallback(async () => {
        if (!setLinkInfo) return;
        try {
            const token =
                typeof window !== 'undefined'
                    ? localStorage.getItem('access_token')
                    : null;
            const r = await fetch(`/api/signature/${signatureHash}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (r.ok) {
                const data = (await r.json()) as SignatureLinkInfo;
                setLinkInfo(() => data);
            }
        } catch {
            // ignore
        }
    }, [signatureHash, setLinkInfo]);

    /** After a successful payment, refresh totals and show the Payment tab. */
    const navigateToPaymentAfterRefresh = useCallback(async () => {
        await refreshLinkInfo();
        setActiveTab('payment');
    }, [refreshLinkInfo]);

    const [mobileNavOpened, { open: openMobileNav, close: closeMobileNav }] =
        useDisclosure(false);

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

    const showPaymentTab = signed && !isContractorViewer;

    const availableTabs = useMemo(
        () => [
            { value: 'estimate', label: 'Estimate', icon: IconFileText },
            ...(showPaymentTab
                ? [{ value: 'payment', label: 'Payment', icon: IconCreditCard }]
                : []),
            ...(showDocuments
                ? [{ value: 'documents', label: 'Documents', icon: IconLicense }]
                : []),
            ...(config.show_about === true
                ? [{ value: 'about', label: 'About', icon: IconInfoCircle }]
                : []),
            ...(config.show_past_projects === true
                ? [
                      {
                          value: 'projects',
                          label: 'Past Projects',
                          icon: IconBuilding,
                      },
                  ]
                : []),
            ...(isContractorViewer
                ? [{ value: 'audit', label: 'Audit History', icon: IconHistory }]
                : []),
        ],
        [
            showPaymentTab,
            showDocuments,
            config.show_about,
            config.show_past_projects,
            isContractorViewer,
        ]
    );

    const renderNavigation = () => {
        if (isMobile) {
            return null;
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
        <Box
          style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                borderBottom: '1px solid var(--mantine-color-gray-3)',
                backgroundColor: 'var(--mantine-color-body)',
                height: 56,
            }}
        >
            <Container
              size="xl"
              px="md"
              style={{ maxWidth: '1400px', height: '100%' }}
            >
                <Group
                  justify="space-between"
                  align="center"
                  h={56}
                  wrap="nowrap"
                  gap="md"
                >
                    {isMobile ? (
                        <Burger
                          opened={mobileNavOpened}
                          onClick={openMobileNav}
                          size="sm"
                          aria-label="Open navigation"
                        />
                    ) : (
                        <Box style={{ flex: 1, minWidth: 0 }} />
                    )}
                    <Box
                      style={{
                            flex: 1,
                            display: 'flex',
                            justifyContent: 'center',
                            minWidth: 0,
                        }}
                    >
                        {showQuickSignCta ? (
                            <Button
                              size={isMobile ? 'sm' : 'md'}
                              leftSection={<IconSignature size={isMobile ? 16 : 18} />}
                              onClick={handleSignatureClick}
                              variant="filled"
                              radius="md"
                              fw={600}
                              style={{
                                  minWidth: isMobile ? 140 : 440,
                              }}
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
                    </Box>
                    <Box style={{ flex: 1, minWidth: 0 }} />
                </Group>
            </Container>
        </Box>
    );

    const depositAmount = linkInfo.deposit_amount ?? 0;
    const paymentSummary = linkInfo.payment_summary;
    const isChangeOrder = Boolean(linkInfo.estimate?.original_estimate_id);
    const isBillingNeeded =
        linkInfo.estimate?.status === 'PROJECT_BILLING_NEEDED' ||
        linkInfo.status === 'PROJECT_BILLING_NEEDED';
    const depositPaidFromServer = paymentSummary?.deposit_paid ?? false;
    /** Invoice email uses `?pay=balance` — allow full balance checkout even if deposit unpaid. */
    const invoiceBalanceLink =
        payIntent === 'balance' && !depositPaidFromServer;

    const showClientDeposit =
        signed &&
        !isContractorViewer &&
        depositAmount > 0 &&
        !isChangeOrder &&
        !depositPaidThisSession &&
        !depositPaidFromServer &&
        !invoiceBalanceLink;

    const showBalancePayment =
        signed &&
        !isContractorViewer &&
        (linkInfo.helcim_configured ?? false) &&
        !!paymentSummary &&
        paymentSummary.amount_due_now > 0 &&
        !paymentSummary.fully_paid &&
        (payIntent === 'balance' || isBillingNeeded);

    /** Invoice links use `?pay=balance` — open the Payment tab when balance can be paid. */
    useEffect(() => {
        if (
            payIntent !== 'balance' ||
            !signed ||
            isContractorViewer ||
            !showBalancePayment
        ) {
            return undefined;
        }
        setActiveTab('payment');
        return undefined;
    }, [payIntent, signed, isContractorViewer, showBalancePayment]);

    /** Already paid in full: land on Payment once (e.g. returning from email). */
    useEffect(() => {
        if (
            initialPaidTabRedirectRef.current ||
            !signed ||
            isContractorViewer ||
            !paymentSummary?.fully_paid
        ) {
            return undefined;
        }
        initialPaidTabRedirectRef.current = true;
        setActiveTab('payment');
        return undefined;
    }, [signed, isContractorViewer, paymentSummary?.fully_paid]);

    /** If client unsigned, Payment tab is hidden — avoid a stuck active tab. */
    useEffect(() => {
        if (!showPaymentTab && activeTab === 'payment') {
            setActiveTab('estimate');
        }
        return undefined;
    }, [showPaymentTab, activeTab]);

    return (
        <>
            <Modal
              opened={depositModalOpened && showClientDeposit}
              onClose={() => setDepositModalOpened(false)}
              title={null}
              centered
              size="md"
              radius="md"
              padding="lg"
            >
                <Stack gap="lg">
                    <Title order={3}>Pay 30% deposit now</Title>
                    <DepositSection
                      embedded
                      signatureHash={signatureHash}
                      depositAmount={depositAmount}
                      estimateTotal={linkInfo.estimate_total ?? 0}
                      helcimConfigured={linkInfo.helcim_configured ?? false}
                      onPaymentSuccess={async () => {
                          setDepositPaidThisSession(true);
                          setDepositModalOpened(false);
                          await navigateToPaymentAfterRefresh();
                      }}
                    />
                </Stack>
            </Modal>
            {isMobile && (
                <Drawer
                  opened={mobileNavOpened}
                  onClose={closeMobileNav}
                  title="Menu"
                  position="left"
                  size="sm"
                >
                    <Stack gap="xs">
                        {linkInfo.contractor && (
                            <Box
                              pb="md"
                              style={{
                                    borderBottom:
                                        '1px solid var(--mantine-color-gray-3)',
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
                              onClick={() => {
                                    setActiveTab(tab.value);
                                    closeMobileNav();
                                }}
                              style={{
                                    borderRadius:
                                        'var(--mantine-radius-sm)',
                                }}
                            />
                        ))}
                    </Stack>
                </Drawer>
            )}
        <AppShell
          padding={0}
          navbar={
                isMobile
                    ? undefined
                    : { width: 250, breakpoint: 'sm' }
            }
        >
            {!isMobile && renderNavigation()}
            <AppShell.Main>
                {renderHeader()}
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
                                        {paymentSummary?.fully_paid
                                            ? 'This estimate is signed and paid in full. Thank you!'
                                            : depositPaidThisSession
                                                ? 'This estimate is signed and we received your payment. Thank you!'
                                                : 'This estimate has been signed.'}
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
                                                if (
                                                    (linkInfo.deposit_amount ??
                                                        0) > 0 &&
                                                    !isChangeOrder &&
                                                    !linkInfo.payment_summary
                                                        ?.deposit_paid
                                                ) {
                                                    setDepositModalOpened(true);
                                                }
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

                        {activeTab === 'payment' &&
                            signed &&
                            !isContractorViewer && (
                            <Stack gap="lg">
                                <div>
                                    <Title order={3} mb="xs">
                                        Payment
                                    </Title>
                                    <Text size="sm" c="dimmed">
                                        Review what you owe and see your payment history for
                                        this project.
                                    </Text>
                                </div>
                                {paymentSummary?.fully_paid && (
                                    <Alert color="green" variant="light">
                                        This project is paid in full. Thank you!
                                    </Alert>
                                )}
                                {paymentSummary && (
                                    <Paper
                                      shadow="sm"
                                      p="md"
                                      radius="md"
                                      withBorder
                                    >
                                        <Text fw={600} size="sm" mb="xs">
                                            Payment summary
                                        </Text>
                                        <Stack gap={4}>
                                            <Group justify="space-between">
                                                <Text size="sm" c="dimmed">
                                                    Invoice total
                                                </Text>
                                                <Text size="sm" fw={500}>
                                                    $
                                                    {paymentSummary.invoice_total.toFixed(
                                                        2
                                                    )}
                                                </Text>
                                            </Group>
                                            {isChangeOrder && paymentSummary.deposit_amount > 0 && (
                                                <Group justify="space-between">
                                                    <Text size="sm" c="dimmed">
                                                        Deferred deposit (included in amount due)
                                                    </Text>
                                                    <Text size="sm" fw={500}>
                                                        $
                                                        {paymentSummary.deposit_amount.toFixed(
                                                            2
                                                        )}
                                                    </Text>
                                                </Group>
                                            )}
                                            <Group justify="space-between">
                                                <Text size="sm" c="dimmed">
                                                    Paid to date
                                                </Text>
                                                <Text size="sm" fw={500}>
                                                    $
                                                    {paymentSummary.amount_paid_so_far.toFixed(
                                                        2
                                                    )}
                                                </Text>
                                            </Group>
                                            <Group justify="space-between">
                                                <Text size="sm" c="dimmed">
                                                    Amount due upon completion of project
                                                </Text>
                                                <Text size="sm" fw={600}>
                                                    $
                                                    {paymentSummary.amount_due_now.toFixed(
                                                        2
                                                    )}
                                                </Text>
                                            </Group>
                                        </Stack>
                                    </Paper>
                                )}
                                {showBalancePayment && (
                                    <DepositSection
                                      signatureHash={signatureHash}
                                      depositAmount={depositAmount}
                                      estimateTotal={
                                          linkInfo.estimate_total ?? 0
                                      }
                                      helcimConfigured={
                                          linkInfo.helcim_configured ?? false
                                      }
                                      paymentMode="balance"
                                      amountToCharge={
                                          paymentSummary!.amount_due_now
                                      }
                                      onPaymentSuccess={
                                          navigateToPaymentAfterRefresh
                                      }
                                    />
                                )}
                                {showClientDeposit && !depositModalOpened && (
                                    <DepositSection
                                      signatureHash={signatureHash}
                                      depositAmount={depositAmount}
                                      helcimConfigured={
                                          linkInfo.helcim_configured ?? false
                                      }
                                      estimateTotal={
                                          linkInfo.estimate_total ?? 0
                                      }
                                      onPaymentSuccess={async () => {
                                          setDepositPaidThisSession(true);
                                          await navigateToPaymentAfterRefresh();
                                      }}
                                    />
                                )}
                            </Stack>
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
        </>
    );
}
