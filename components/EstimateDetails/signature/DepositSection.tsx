'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Alert, Button, Loader, Paper, Stack, Text } from '@mantine/core';

const HELCIM_SCRIPT_URL = 'https://secure.helcim.app/helcim-pay/services/start.js';

interface DepositSectionProps {
    signatureHash: string;
    depositAmount: number;
    estimateTotal: number;
}

const PAYMENT_RECORD_ERROR =
    'Payment succeeded but we could not record it. Please contact support.';

export function DepositSection({
    signatureHash,
    depositAmount,
}: DepositSectionProps) {
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
                    body: JSON.stringify({ amount: depositAmount }),
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
                                        transaction_id:
                                            event.data?.eventMessage?.data
                                                ?.transactionId,
                                    }),
                                }
                            );
                            if (confirmRes.ok) {
                                setPaySuccess(true);
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
            };
            listenerRef.current = handler;
            window.addEventListener('message', handler);

            if (typeof (window as any).appendHelcimPayIframe === 'function') {
                (window as any).appendHelcimPayIframe(token);
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
    }, [signatureHash, depositAmount, loadHelcimScript, removeListener]);

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
            <Alert color="green" variant="light" mb="xl">
                Payment received. Thank you!
            </Alert>
        );
    }

    return (
        <Paper shadow="sm" p="lg" radius="md" withBorder mb="xl">
            <Stack gap="md">
                <Text fw={600} size="lg">
                    Pay 30% deposit
                </Text>
                <Text c="dimmed" size="sm">
                    {`A 30% deposit of $${depositAmount.toFixed(2)} is due prior to commencement of work.`}
                </Text>
                {payError && (
                    <Alert color="red" variant="light" onClose={() => setPayError(null)} withCloseButton>
                        {payError}
                    </Alert>
                )}
                <Button
                  onClick={handlePayNow}
                  loading={payLoading}
                  disabled={payLaterLoading}
                  size="md"
                >
                    {payLoading ? (
                        <>
                            <Loader size="sm" mr="xs" />
                            Opening payment…
                        </>
                    ) : (
                        `Pay 30% deposit now ($${depositAmount.toFixed(2)})`
                    )}
                </Button>
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
            </Stack>
        </Paper>
    );
}
