'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    Alert,
    AppShell,
    Badge,
    Box,
    Burger,
    Button,
    Container,
    Divider,
    Drawer,
    Group,
    Modal,
    NavLink,
    Paper,
    Stack,
    Table,
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
    IconThumbDown,
} from '@tabler/icons-react';

import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import { DepositSection } from '@/components/EstimateDetails/signature/DepositSection';
import EstimateSignaturePreview from '@/components/EstimateDetails/signature/EstimateSignaturePreview';
import SignatureAuditHistory from '@/components/EstimateDetails/signature/SignatureAuditHistory';
import SignatureForm, { SignaturePayload } from '@/components/EstimateDetails/signature/SignatureForm';
import SignaturePageSections, {
    PastProject,
} from '@/components/EstimateDetails/signature/SignaturePageSections';
import {
    ContractorClient,
    Estimate,
    EstimateResource,
    EstimateStatus,
} from '@/components/Global/model';
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

/** Per-row amounts for Payment tab (live; includes change order lines when applicable). */
export interface PaymentLineItemRow {
    title: string;
    line_total: number;
    is_change_order: boolean;
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
    payment_line_items?: PaymentLineItemRow[];
    signatures?: Array<{
        id?: string;
        signature_type: string;
        signature_data: string;
        signer_name?: string;
        signer_email: string;
        signed_at: string;
        is_valid?: boolean;
    }>;
    /** Live estimate status from the database (not the static signature-link status). */
    current_status?: string;
}

interface SignaturePageLayoutProps {
    linkInfo: SignatureLinkInfo;
    signatureHash: string;
    /** From `?pay=balance` or `?pay=deposit` on the sign URL (e.g. invoice email). */
    payIntent?: 'balance' | 'deposit' | null;
    /** From `?tab=payment` on the sign URL. */
    tabIntent?: 'payment' | null;
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
    tabIntent = null,
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
    const [declineModalOpened, setDeclineModalOpened] = useState(false);
    const [declineSubmitting, setDeclineSubmitting] = useState(false);
    const [declineError, setDeclineError] = useState<string | null>(null);
    const initialPaidTabRedirectRef = useRef(false);
    const initialDepositIntentRef = useRef(false);

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

    const paymentLineItemsSubtotal = useMemo(() => {
        const rows = linkInfo.payment_line_items || [];
        return rows.reduce((sum, row) => sum + row.line_total, 0);
    }, [linkInfo.payment_line_items]);

    const estimateDiscountPct = linkInfo.estimate?.discount_percentage ?? 0;
    const estimateDiscountReason = linkInfo.estimate?.discount_reason?.trim();
    const showPaymentDiscountBreakdown =
        estimateDiscountPct > 0 && paymentLineItemsSubtotal > 0;
    const estimateDiscountAmount = showPaymentDiscountBreakdown
        ? paymentLineItemsSubtotal * (estimateDiscountPct / 100)
        : 0;

    const handleSignatureClick = useCallback(() => {
        if (!isContractorViewer && setSignatureModalOpened) {
            setSignatureModalOpened(true);
        }
    }, [isContractorViewer, setSignatureModalOpened]);

    const handleConfirmDecline = useCallback(async () => {
        setDeclineSubmitting(true);
        setDeclineError(null);
        try {
            const response = await fetch(`/api/signature/${signatureHash}/decline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                setDeclineError(
                    (body as { error?: string; detail?: string }).error
                        || (body as { detail?: string }).detail
                        || 'Could not decline this estimate. Please try again.'
                );
                return;
            }
            setDeclineModalOpened(false);
            await refreshLinkInfo();
            logToCloudWatch(
                '[SIGNATURE_FLOW_EVENT] Estimate declined by client. ' +
                    `hash=${signatureHash}`
            ).catch(() => {});
        } finally {
            setDeclineSubmitting(false);
        }
    }, [refreshLinkInfo, signatureHash]);

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

    const estimateLiveStatus =
        linkInfo.current_status ??
        linkInfo.estimate?.status ??
        '';
    const isEstimateDeclined =
        estimateLiveStatus === EstimateStatus.ESTIMATE_DECLINED ||
        estimateLiveStatus === 'ESTIMATE_DECLINED';

    const showQuickSignCta =
        !isContractorViewer &&
        !!setSignatureModalOpened &&
        !signed &&
        !isEstimateDeclined;

    const showDeclineCta =
        !isPreviewMode &&
        !isContractorViewer &&
        !signed &&
        !isEstimateDeclined;

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
                        {showQuickSignCta || showDeclineCta ? (
                            <Group gap="sm" justify="center" wrap="wrap">
                                {showQuickSignCta ? (
                                    <Button
                                      size={isMobile ? 'sm' : 'md'}
                                      leftSection={
                                            <IconSignature size={isMobile ? 16 : 18} />
                                        }
                                      onClick={handleSignatureClick}
                                      variant="filled"
                                      radius="md"
                                      fw={600}
                                      style={{
                                          minWidth: isMobile ? 140 : 200,
                                      }}
                                    >
                                        Quick Sign
                                    </Button>
                                ) : null}
                                {showDeclineCta ? (
                                    <Button
                                      size={isMobile ? 'sm' : 'md'}
                                      leftSection={
                                            <IconThumbDown size={isMobile ? 16 : 18} />
                                        }
                                      onClick={() => {
                                            setDeclineError(null);
                                            setDeclineModalOpened(true);
                                        }}
                                      variant="default"
                                      color="gray"
                                      radius="md"
                                      fw={600}
                                    >
                                        Decline estimate
                                    </Button>
                                ) : null}
                            </Group>
                        ) : signed && !isContractorViewer ? (
                            <Group gap="xs" c="dimmed">
                                <IconSignature size={18} />
                                <Text size="sm" fw={500}>
                                    Signed
                                </Text>
                            </Group>
                        ) : isEstimateDeclined && !isContractorViewer ? (
                            <Group gap="xs" c="dimmed">
                                <IconThumbDown size={18} />
                                <Text size="sm" fw={500}>
                                    Declined
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
    /** Billing-needed or A/R: client should pay full balance (not a separate deposit CTA). */
    const isFullBalancePaymentPhase =
        linkInfo.current_status === 'PROJECT_BILLING_NEEDED' ||
        linkInfo.current_status === 'PROJECT_ACCOUNTS_RECEIVABLE';
    const depositPaidFromServer = paymentSummary?.deposit_paid ?? false;
    /** Invoice email uses `?pay=balance` — allow full balance checkout even if deposit unpaid. */
    const invoiceBalanceLink =
        payIntent === 'balance' && !depositPaidFromServer;

    const showClientDeposit =
        signed &&
        !isContractorViewer &&
        depositAmount > 0 &&
        !isChangeOrder &&
        !isFullBalancePaymentPhase &&
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
        (payIntent === 'balance' || isFullBalancePaymentPhase);

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

    /**
     * Deposit links use `?pay=deposit` — open Payment and (when eligible) open the deposit modal.
     * We dedupe to avoid reopening the modal on re-renders.
     */
    useEffect(() => {
        if (
            initialDepositIntentRef.current ||
            payIntent !== 'deposit' ||
            !signed ||
            isContractorViewer
        ) {
            return undefined;
        }
        setActiveTab('payment');
        if (showClientDeposit) {
            initialDepositIntentRef.current = true;
            setDepositModalOpened(true);
        }
        return undefined;
    }, [payIntent, signed, isContractorViewer, showClientDeposit]);

    /** Direct tab deep-link: `?tab=payment` — select Payment when it becomes available. */
    useEffect(() => {
        if (tabIntent !== 'payment' || isContractorViewer || !showPaymentTab) {
            return undefined;
        }
        setActiveTab('payment');
        return undefined;
    }, [tabIntent, isContractorViewer, showPaymentTab]);

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

    /** Reset dedupe key when the sign URL changes so each visit can log activity. */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        sessionStorage.removeItem(`payment_tab_activity_${signatureHash}`);
    }, [signatureHash]);

    /** System activity: client opened the invoice (Payment tab). */
    useEffect(() => {
        if (
            isPreviewMode ||
            isContractorViewer ||
            !showPaymentTab ||
            activeTab !== 'payment'
        ) {
            return undefined;
        }
        const storageKey = `payment_tab_activity_${signatureHash}`;
        if (sessionStorage.getItem(storageKey)) {
            return undefined;
        }
        sessionStorage.setItem(storageKey, '1');

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        const token = localStorage.getItem('access_token');
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        fetch(`/api/signature/${signatureHash}/payment-opened`, {
            method: 'POST',
            headers,
        }).catch(() => {
            // non-blocking
        });
        return undefined;
    }, [
        activeTab,
        signatureHash,
        showPaymentTab,
        isContractorViewer,
        isPreviewMode,
    ]);

    return (
        <>
            <Modal
              opened={declineModalOpened}
              onClose={() => {
                    setDeclineModalOpened(false);
                    setDeclineError(null);
                }}
              title="Decline this estimate?"
              centered
              size="md"
              radius="md"
            >
                <Stack gap="md">
                    <Text size="sm">
                        This tells the contractor you are not moving forward with this
                        proposal. You will not be asked to sign unless they send a new
                        estimate.
                    </Text>
                    {declineError ? (
                        <Alert color="red" variant="light">
                            {declineError}
                        </Alert>
                    ) : null}
                    <Group justify="flex-end" gap="sm">
                        <Button
                          variant="default"
                          onClick={() => {
                                setDeclineModalOpened(false);
                                setDeclineError(null);
                            }}
                          disabled={declineSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                          color="red"
                          loading={declineSubmitting}
                          onClick={handleConfirmDecline}
                        >
                            Decline estimate
                        </Button>
                    </Group>
                </Stack>
            </Modal>
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
                                {isEstimateDeclined && !isContractorViewer && (
                                    <Alert
                                      icon={<IconThumbDown size={16} />}
                                      title="Estimate declined"
                                      color="gray"
                                      variant="light"
                                      mb="xl"
                                    >
                                        You have declined this proposal.
                                    </Alert>
                                )}
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
                                            !isContractorViewer &&
                                            !signed &&
                                            !isEstimateDeclined
                                        }
                                      signatures={linkInfo.signatures || []}
                                    />
                                </Box>
                                {!isContractorViewer &&
                                    setLinkInfo &&
                                    setSigned &&
                                    setSignatureModalOpened &&
                                    !isEstimateDeclined && (
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
                                                    !isFullBalancePaymentPhase &&
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
                                {linkInfo.payment_line_items &&
                                    linkInfo.payment_line_items.length > 0 && (
                                    <Paper
                                      shadow="sm"
                                      p="md"
                                      radius="md"
                                      withBorder
                                    >
                                        <Text fw={600} size="sm" mb="sm">
                                            Invoice line items
                                        </Text>
                                        <Table
                                          verticalSpacing="sm"
                                          withTableBorder
                                          withColumnBorders
                                        >
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Description</Table.Th>
                                                    <Table.Th style={{ textAlign: 'right' }}>
                                                        Amount
                                                    </Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {linkInfo.payment_line_items.map(
                                                    (row, idx) => (
                                                        <Table.Tr
                                                          key={`${row.title}-${idx}-${row.line_total}`}
                                                        >
                                                            <Table.Td>
                                                                <Group
                                                                  gap="xs"
                                                                  align="flex-start"
                                                                  wrap="wrap"
                                                                >
                                                                    <Text size="sm">
                                                                        {row.title}
                                                                    </Text>
                                                                    {row.is_change_order ? (
                                                                        <Badge
                                                                          size="xs"
                                                                          variant="light"
                                                                          color="gray"
                                                                        >
                                                                            Change order
                                                                        </Badge>
                                                                    ) : null}
                                                                </Group>
                                                            </Table.Td>
                                                            <Table.Td
                                                              style={{ textAlign: 'right' }}
                                                            >
                                                                <Text size="sm" fw={500}>
                                                                    $
                                                                    {row.line_total.toFixed(
                                                                        2
                                                                    )}
                                                                </Text>
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    )
                                                )}
                                            </Table.Tbody>
                                        </Table>
                                    </Paper>
                                )}
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
                                            {showPaymentDiscountBreakdown ? (
                                                <>
                                                    <Group justify="space-between">
                                                        <Text size="sm" c="dimmed">
                                                            Subtotal (line items)
                                                        </Text>
                                                        <Text size="sm" fw={500}>
                                                            $
                                                            {paymentLineItemsSubtotal.toFixed(
                                                                2
                                                            )}
                                                        </Text>
                                                    </Group>
                                                    <Group
                                                      justify="space-between"
                                                      align="flex-start"
                                                      wrap="nowrap"
                                                    >
                                                        <Stack gap={2}>
                                                            <Text size="sm" c="dimmed">
                                                                Discount (
                                                                {estimateDiscountPct}%)
                                                            </Text>
                                                            {estimateDiscountReason ? (
                                                                <Text size="xs" c="dimmed">
                                                                    {estimateDiscountReason}
                                                                </Text>
                                                            ) : null}
                                                        </Stack>
                                                        <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                                                            −$
                                                            {estimateDiscountAmount.toFixed(
                                                                2
                                                            )}
                                                        </Text>
                                                    </Group>
                                                    <Divider my={4} />
                                                </>
                                            ) : null}
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
