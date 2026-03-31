'use client';

import { useEffect, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Image,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMail } from '@tabler/icons-react';
import NextImage from 'next/image';

import { getApiHeaders } from '@/app/utils/apiClient';
import { useContractorLogo } from '@/hooks/useContractorLogo';

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export interface InvoicePreviewScope {
  estimate_id: string;
  label: string;
  subtotal: number;
  is_change_order: boolean;
}

export interface InvoicePreviewResponse {
  estimate_id: string;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  invoice_total: number;
  deposit_amount: number;
  balance_amount: number;
  deposit_paid: boolean;
  amount_due: number;
  is_change_order: boolean;
  scopes: InvoicePreviewScope[];
}

function useHelcimConfigured(shouldFetch: boolean) {
  const [helcimConfigured, setHelcimConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (!shouldFetch) {
      return undefined;
    }
    setHelcimConfigured(null);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/helcim/status', {
          method: 'GET',
          headers: getApiHeaders(),
        });
        if (!res.ok) throw new Error('helcim status failed');
        const data = (await res.json()) as { configured?: boolean };
        if (!cancelled) {
          setHelcimConfigured(Boolean(data.configured));
        }
      } catch {
        if (!cancelled) setHelcimConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shouldFetch]);

  return helcimConfigured;
}

async function fetchInvoicePreview(
  estimateId: string
): Promise<{ ok: true; data: InvoicePreviewResponse } | { ok: false; message: string }> {
  const res = await fetch(`/api/estimates/${estimateId}/invoice/preview`, {
    method: 'GET',
    headers: getApiHeaders(),
  });
  if (res.ok) {
    const data = (await res.json()) as InvoicePreviewResponse;
    return { ok: true, data };
  }
  const err = await res.json().catch(() => ({}));
  return { ok: false, message: (err as { message?: string }).message || 'Failed to load preview' };
}

async function postSendInvoiceEmail(
  estimateId: string,
  manualDepositPaidAmount?: number
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/estimates/${estimateId}/invoice/send-email`, {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify(
      typeof manualDepositPaidAmount === 'number'
        ? { manual_deposit_paid_amount: manualDepositPaidAmount }
        : {}
    ),
  });
  if (res.ok) {
    return { ok: true };
  }
  const err = await res.json().catch(() => ({}));
  return { ok: false, message: (err as { message?: string }).message };
}

function InvoiceTotalsSection({
  preview,
  helcimConfigured,
  manualDepositPaidAmount,
}: {
  preview: InvoicePreviewResponse;
  helcimConfigured: boolean | null;
  manualDepositPaidAmount?: number;
}) {
  const manualPaid =
    typeof manualDepositPaidAmount === 'number' && manualDepositPaidAmount > 0
      ? manualDepositPaidAmount
      : 0;
  const showManualDeposit = !preview.is_change_order && manualPaid > 0;
  const amountDueThisEmail = showManualDeposit
    ? Math.max(preview.invoice_total - manualPaid, 0)
    : preview.amount_due;

  const scopeRows = preview.scopes.map((s) => (
    <Table.Tr key={s.estimate_id}>
      <Table.Td>
        <Text size="sm">{s.label}</Text>
        {s.is_change_order ? (
          <Text size="xs" c="dimmed">
            Change order
          </Text>
        ) : null}
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        <Text size="sm" fw={500}>
          {formatUsd(s.subtotal)}
        </Text>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Totals include this job&apos;s line items and any signed change orders rolled into the
        invoice.
      </Text>
      <Table withTableBorder withColumnBorders verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Scope</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Subtotal</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{scopeRows}</Table.Tbody>
      </Table>

      <Stack gap={6}>
        <Group justify="space-between">
          <Text size="sm">Subtotal (line items)</Text>
          <Text size="sm" fw={500}>
            {formatUsd(preview.subtotal)}
          </Text>
        </Group>
        {preview.discount_percentage > 0 ? (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Discount ({preview.discount_percentage}%)
            </Text>
            <Text size="sm" c="dimmed">
              −{formatUsd(preview.discount_amount)}
            </Text>
          </Group>
        ) : null}
        {preview.tax_rate > 0 ? (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Tax ({preview.tax_rate}%)
            </Text>
            <Text size="sm" c="dimmed">
              {formatUsd(preview.tax_amount)}
            </Text>
          </Group>
        ) : null}
        <Divider />
        <Group justify="space-between">
          <Text size="sm" fw={600}>
            Invoice total
          </Text>
          <Text size="sm" fw={700}>
            {formatUsd(preview.invoice_total)}
          </Text>
        </Group>
        {!preview.is_change_order && preview.deposit_paid && !showManualDeposit ? (
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              30% deposit (already paid)
            </Text>
            <Text size="xs" c="dimmed">
              {formatUsd(preview.deposit_amount)}
            </Text>
          </Group>
        ) : null}
        {showManualDeposit ? (
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Manual deposit (already paid)
            </Text>
            <Text size="xs" c="dimmed">
              {formatUsd(manualPaid)}
            </Text>
          </Group>
        ) : null}
        <Group justify="space-between">
          <Text size="sm" fw={600}>
            Amount due (this email)
          </Text>
          <Text size="sm" fw={700} c="blue">
            {formatUsd(amountDueThisEmail)}
          </Text>
        </Group>
      </Stack>

      {helcimConfigured === false ? (
        <Alert color="yellow" title="Online payments not configured">
          The client will still get the link to your sign page; configure Helcim in Settings →
          Integrations to let them pay online.
        </Alert>
      ) : null}
    </Stack>
  );
}

export interface CollectPaymentModalProps {
  opened: boolean;
  onClose: () => void;
  estimateId: string;
}

export function CollectPaymentModal({ opened, onClose, estimateId }: CollectPaymentModalProps) {
  const { logoUrl } = useContractorLogo();
  const helcimConfigured = useHelcimConfigured(opened);
  const [sendingInvoiceEmail, setSendingInvoiceEmail] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<InvoicePreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [manualDepositPaidAmount, setManualDepositPaidAmount] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    if (!opened || !estimateId) {
      return undefined;
    }
    let cancelled = false;
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);
    setManualDepositPaidAmount(null);
    (async () => {
      const result = await fetchInvoicePreview(estimateId);
      if (cancelled) return;
      setPreviewLoading(false);
      if (result.ok) {
        setPreview(result.data);
      } else {
        setPreviewError(result.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opened, estimateId]);

  const handleSendEmail = async () => {
    if (!estimateId) return;
    setSendingInvoiceEmail(true);
    try {
      const result = await postSendInvoiceEmail(
        estimateId,
        typeof manualDepositPaidAmount === 'number' ? manualDepositPaidAmount : undefined
      );
      if (result.ok) {
        notifications.show({
          title: 'Invoice sent',
          message: 'The client has been emailed a link to pay.',
          color: 'green',
        });
        onClose();
      } else {
        notifications.show({
          title: 'Failed to send invoice',
          message: result.message || 'Please try again.',
          color: 'red',
        });
      }
    } finally {
      setSendingInvoiceEmail(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="lg"
      radius="md"
      padding="xl"
      title={
        <Stack gap="sm" align="flex-start">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Company logo"
              h={40}
              w="auto"
              fit="contain"
              style={{ maxWidth: 200 }}
            />
          ) : null}
          <Stack gap={4} style={{ width: '100%' }}>
            <Title order={4}>Send invoice email</Title>
            <Text size="sm" c="dimmed" fw={400}>
              Review amounts, then email the client a payment link to your signed estimate page.
            </Text>
          </Stack>
        </Stack>
      }
    >
      <Stack gap="lg" pt="xs">
        {previewLoading ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : previewError ? (
          <Alert color="red" title="Could not load invoice totals">
            {previewError}
          </Alert>
        ) : preview ? (
          <Stack gap="md">
            {!preview.is_change_order ? (
              <NumberInput
                label="Manual deposit already paid (optional)"
                description="Use this if you already received a deposit by check/cash/etc. This will reduce the amount due shown on the payment page."
                placeholder="0.00"
                min={0}
                max={preview.invoice_total}
                value={manualDepositPaidAmount}
                onChange={(v) => {
                  const n = typeof v === 'number' ? v : undefined;
                  setManualDepositPaidAmount(n);
                }}
                decimalScale={2}
                fixedDecimalScale
                hideControls
              />
            ) : null}
            <InvoiceTotalsSection
              preview={preview}
              helcimConfigured={helcimConfigured}
              manualDepositPaidAmount={manualDepositPaidAmount}
            />
          </Stack>
        ) : null}

        <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              The email includes a link to your signed estimate page. The client can pay the amount
              due from any device.
            </Text>
            {helcimConfigured === true && (
              <Box
                py="xs"
                style={{
                  borderTop: '1px solid var(--mantine-color-gray-3)',
                }}
              >
                <Group gap="sm" align="center" wrap="wrap" justify="center">
                  <Text size="xs" c="dimmed">
                    Collect securely with
                  </Text>
                  <NextImage
                    src="/helcim-logo.png"
                    alt="Helcim"
                    width={120}
                    height={32}
                    style={{
                      height: 26,
                      width: 'auto',
                    }}
                  />
                </Group>
              </Box>
            )}
            <Button
              fullWidth
              size="md"
              leftSection={<IconMail size={18} />}
              loading={sendingInvoiceEmail}
              disabled={!estimateId || previewLoading || !!previewError || !preview}
              onClick={handleSendEmail}
            >
              Send email with invoice
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Modal>
  );
}

export interface CollectPaymentBillingBannerProps {
  estimateId: string;
  onOpenModal?: () => void;
}

export function CollectPaymentBillingBanner({
  estimateId,
  onOpenModal,
}: CollectPaymentBillingBannerProps) {
  const { logoUrl } = useContractorLogo();
  const helcimConfigured = useHelcimConfigured(Boolean(estimateId));
  const [sendingInvoiceEmail, setSendingInvoiceEmail] = useState(false);

  const handleSendEmail = async () => {
    if (!estimateId) return;
    setSendingInvoiceEmail(true);
    try {
      const result = await postSendInvoiceEmail(estimateId);
      if (result.ok) {
        notifications.show({
          title: 'Invoice sent',
          message: 'The client has been emailed a link to pay.',
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Failed to send invoice',
          message: result.message || 'Please try again.',
          color: 'red',
        });
      }
    } finally {
      setSendingInvoiceEmail(false);
    }
  };

  const inner = (
    <Stack gap="sm">
      <Stack gap="xs" align="flex-start">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Company logo"
            h={44}
            w="auto"
            fit="contain"
            style={{ maxWidth: 200 }}
          />
        ) : null}
        <Stack gap={4} style={{ width: '100%' }}>
          <Text size="sm" fw={600}>
            Ready to collect payment
          </Text>
          <Text size="xs" c="dimmed">
            This job is in Project billing needed. Review invoice totals and send the client a
            payment link by email when you are ready.
          </Text>
          {helcimConfigured === true && (
            <Group gap={6} align="center" wrap="wrap">
              <Text size="xs" c="dimmed">
                Online payments via
              </Text>
              <NextImage
                src="/helcim-logo.png"
                alt="Helcim"
                width={100}
                height={24}
                style={{ height: 20, width: 'auto' }}
              />
            </Group>
          )}
        </Stack>
      </Stack>

      <Stack gap="xs">
        <Button
          fullWidth
          leftSection={<IconMail size={16} />}
          loading={sendingInvoiceEmail}
          disabled={!estimateId}
          size="sm"
          onClick={() => {
            if (onOpenModal) {
              onOpenModal();
              return;
            }
            handleSendEmail();
          }}
        >
          {onOpenModal ? 'Review & send invoice' : 'Email payment link'}
        </Button>
      </Stack>
    </Stack>
  );

  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      mb="md"
      style={{
        borderColor: 'var(--mantine-color-blue-3)',
        background: 'var(--mantine-color-blue-0)',
      }}
    >
      {inner}
    </Paper>
  );
}
