'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
    Alert,
    Box,
    Button,
    Center,
    Group,
    Loader,
    Paper,
    Stack,
    Text,
} from '@mantine/core';
import Image from 'next/image';

const HELCIM_SCRIPT_URL = 'https://secure.helcim.app/helcim-pay/services/start.js';

interface DepositSectionProps {
    signatureHash: string;
    depositAmount: number;
    estimateTotal: number;
    helcimConfigured?: boolean;
    /** Omit outer Paper + default heading (e.g. when used inside deposit modal). */
    embedded?: boolean;
    /** Called after payment is recorded successfully (modal can close, etc.). */
    onPaymentSuccess?: () => void;
    /** `deposit` = 30% deposit; `balance` = remaining invoice per payment_summary. */
    paymentMode?: 'deposit' | 'balance';
    /** Amount sent to checkout-session (defaults to depositAmount in deposit mode). */
    amountToCharge?: number;
}

const PAYMENT_RECORD_ERROR =
    'Payment succeeded but we could not record it. Please contact support.';

/** Wait until Helcim injects the iframe and it finishes loading (or timeout). */
function waitForHelcimPayIframeReady(maxWaitMs = 12000): Promise<void> {
    return new Promise((resolve) => {
        let resolved = false;
        /** Browser timer handles are numeric; avoid NodeJS.Timeout vs number clashes in CI. */
        let intervalId: number | undefined;
        const finish = () => {
            if (resolved) return;
            resolved = true;
            if (intervalId !== undefined) {
                window.clearInterval(intervalId);
            }
            resolve();
        };
        const overall = window.setTimeout(finish, maxWaitMs);
        intervalId = window.setInterval(() => {
            const frame = document.getElementById('helcimPayIframe');
            if (frame instanceof HTMLIFrameElement && intervalId !== undefined) {
                window.clearInterval(intervalId);
                intervalId = undefined;
                let backup = 0;
                const onReady = () => {
                    window.clearTimeout(overall);
                    window.clearTimeout(backup);
                    finish();
                };
                frame.addEventListener('load', onReady, { once: true });
                backup = window.setTimeout(onReady, 4000);
            }
        }, 50);
    });
}

function PaySecurelyWithHelcim() {
    return (
        <Group
          gap="sm"
          align="center"
          wrap="wrap"
          justify="center"
          w="100%"
        >
            <Text size="sm" c="dimmed">
                Pay securely with
            </Text>
            <Image
              src="/helcim-logo.png"
              alt="Helcim"
              width={120}
              height={32}
              style={{ height: 28, width: 'auto' }}
            />
        </Group>
    );
}

export function DepositSection({
    signatureHash,
    depositAmount,
    estimateTotal,
    helcimConfigured = false,
    embedded = false,
    onPaymentSuccess,
    paymentMode = 'deposit',
    amountToCharge: amountToChargeProp,
}: DepositSectionProps) {
    const isBalance = paymentMode === 'balance';
    const chargeAmount = amountToChargeProp ?? depositAmount;
    const [payLoading, setPayLoading] = useState(false);
    const [payLaterLoading, setPayLaterLoading] = useState(false);
    const [payLaterSent, setPayLaterSent] = useState(false);
    const [paySuccess, setPaySuccess] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);
    const listenerRef = useRef<((e: MessageEvent) => void) | null>(null);
    const checkoutTokenRef = useRef<string | null>(null);
    const purposeRef = useRef<'deposit' | 'balance'>('deposit');

    const loadHelcimScript = useCallback((): Promise<void> => new Promise((resolve, reject) => {
            if (typeof document === 'undefined') {
                reject(new Error('No document'));
                return;
            }
            if (document.querySelector(`script[src="${HELCIM_SCRIPT_URL}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = HELCIM_SCRIPT_URL;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Helcim Pay'));
            document.head.appendChild(script);
        }), []);

    const removeListener = useCallback(() => {
        if (listenerRef.current && typeof window !== 'undefined') {
            window.removeEventListener('message', listenerRef.current);
            listenerRef.current = null;
        }
        const frame = document.getElementById('helcimPayIframe');
        if (frame && frame instanceof HTMLIFrameElement) {
            frame.remove();
        }
    }, []);

    useEffect(() => () => {
            removeListener();
        }, [removeListener]);

    const handlePayNow = useCallback(async () => {
        setPayError(null);
        setPayLoading(true);
        try {
            await loadHelcimScript();
            const res = await fetch(
                `/api/signature/${signatureHash}/helcim/checkout-session`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: chargeAmount }),
                }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Could not start payment');
            }
            const data = await res.json();
            const token = data.checkout_token;
            const purpose = data.purpose || 'deposit';
            if (!token) throw new Error('No checkout token');
            checkoutTokenRef.current = token;
            purposeRef.current = purpose;
            const amountCharged =
                typeof data.amount === 'number' && !Number.isNaN(data.amount)
                    ? data.amount
                    : chargeAmount;

            const helcimPayJsKey = `helcim-pay-js-${token}`;
            const handler = (event: MessageEvent) => {
                if (event.data?.eventName !== helcimPayJsKey) return;
                if (event.data?.eventStatus === 'SUCCESS') {
                    setPayLoading(false);
                    removeListener();
                    (async () => {
                        try {
                            const confirmRes = await fetch(
                                `/api/signature/${signatureHash}/helcim/confirm-payment`,
                                {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        purpose: purposeRef.current,
                                        amount_paid: amountCharged,
                                        transaction_id:
                                            event.data?.eventMessage?.data
                                                ?.transactionId,
                                    }),
                                }
                            );
                            if (confirmRes.ok) {
                                setPaySuccess(true);
                                onPaymentSuccess?.();
                            } else {
                                setPayError(PAYMENT_RECORD_ERROR);
                            }
                        } catch {
                            setPayError(PAYMENT_RECORD_ERROR);
                        }
                    })();
                }
                if (event.data?.eventStatus === 'ABORTED') {
                    setPayLoading(false);
                    removeListener();
                    setPayError(event.data?.eventMessage || 'Payment was declined.');
                }
                if (event.data?.eventStatus === 'HIDE') {
                    setPayLoading(false);
                    removeListener();
                }
            };
            listenerRef.current = handler;
            window.addEventListener('message', handler);

            if (typeof (window as any).appendHelcimPayIframe === 'function') {
                (window as any).appendHelcimPayIframe(token);
                await waitForHelcimPayIframeReady();
            } else {
                setPayError('Payment form failed to load. Please try again.');
                removeListener();
            }
        } catch (e) {
            setPayError(e instanceof Error ? e.message : 'Something went wrong.');
            removeListener();
        } finally {
            setPayLoading(false);
        }
    }, [
        signatureHash,
        chargeAmount,
        loadHelcimScript,
        removeListener,
        onPaymentSuccess,
    ]);

    const handlePayLater = useCallback(async () => {
        setPayError(null);
        setPayLaterLoading(true);
        try {
            const res = await fetch(
                `/api/signature/${signatureHash}/send-deposit-email`,
                { method: 'POST' }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to send email');
            }
            setPayLaterSent(true);
        } catch (e) {
            setPayError(e instanceof Error ? e.message : 'Failed to send email.');
        } finally {
            setPayLaterLoading(false);
        }
    }, [signatureHash]);

    if (paySuccess) {
        return (
            <Alert color="green" variant="light" mb={embedded ? 0 : 'xl'}>
                Payment received. Thank you!
            </Alert>
        );
    }

    const body = (
        <>
        {payLoading && (
            <Box
              pos="fixed"
              top={0}
              left={0}
              right={0}
              bottom={0}
              style={{ zIndex: 10000 }}
              bg="rgba(255, 255, 255, 0.92)"
            >
                <Center h="100%" p="md">
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text size="sm" c="dimmed" ta="center">
                            Opening secure payment…
                        </Text>
                    </Stack>
                </Center>
            </Box>
        )}
        <Stack gap="md">
                {!embedded && (
                    <Text fw={600} size="lg">
                        {isBalance
                            ? (helcimConfigured ? 'Pay invoice' : 'Invoice payment')
                            : (helcimConfigured ? 'Pay 30% deposit' : 'Request 30% deposit')}
                    </Text>
                )}
                <Text c="dimmed" size="sm">
                    {isBalance
                        ? `Amount due: $${chargeAmount.toFixed(2)}. Pay securely online to complete your payment.`
                        : `A 30% deposit of $${depositAmount.toFixed(2)} is due prior to commencement of work.`}
                </Text>
                {isBalance && estimateTotal > 0 && (
                    <Text size="xs" c="dimmed">
                        {`Total project value: $${estimateTotal.toFixed(2)}`}
                    </Text>
                )}
                {payError && (
                    <Alert color="red" variant="light" onClose={() => setPayError(null)} withCloseButton>
                        {payError}
                    </Alert>
                )}
                {helcimConfigured ? (
                    <>
                        <Button
                          onClick={handlePayNow}
                          loading={payLoading}
                          disabled={payLaterLoading || payLoading}
                          size="md"
                          fullWidth
                        >
                            {isBalance
                                ? `Pay now ($${chargeAmount.toFixed(2)})`
                                : `Pay 30% deposit now ($${depositAmount.toFixed(2)})`}
                        </Button>
                        <PaySecurelyWithHelcim />
                    </>
                ) : (
                    <Text size="xs" c="dimmed">
                        {isBalance
                            ? 'Online payment isn&apos;t set up for this contractor. Please contact them to pay your balance.'
                            : 'Online payment isn&apos;t set up for this contractor. We&apos;ll send you a deposit request to complete payment later.'}
                    </Text>
                )}
                {!isBalance && (
                <Text size="xs" c="dimmed">
                    Or{' '}
                    <button
                      type="button"
                      onClick={handlePayLater}
                      disabled={payLaterLoading || payLaterSent}
                      style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: payLaterSent ? 'default' : 'pointer',
                          textDecoration: 'underline',
                          color: 'var(--mantine-color-dimmed)',
                      }}
                    >
                        {payLaterSent
                            ? "We've sent the deposit request to your email."
                            : payLaterLoading
                                ? 'Sending…'
                                : "I'll pay later"}
                    </button>
                </Text>
                )}
        </Stack>
        </>
    );

    if (embedded) {
        return body;
    }

    return (
        <Paper shadow="sm" p="lg" radius="md" withBorder mb="xl">
            {body}
        </Paper>
    );
}
