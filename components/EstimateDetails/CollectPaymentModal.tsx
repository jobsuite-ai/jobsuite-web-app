'use client';

import { useEffect, useState } from 'react';

import {
  Box,
  Button,
  Center,
  Group,
  Image,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMail } from '@tabler/icons-react';
import NextImage from 'next/image';

import { getApiHeaders } from '@/app/utils/apiClient';
import { useContractorLogo } from '@/hooks/useContractorLogo';

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

async function postSendInvoiceEmail(
  estimateId: string
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/estimates/${estimateId}/invoice/send-email`, {
    method: 'POST',
    headers: getApiHeaders(),
  });
  if (res.ok) {
    return { ok: true };
  }
  const err = await res.json().catch(() => ({}));
  return { ok: false, message: (err as { message?: string }).message };
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
      size="md"
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
            <Title order={4}>Collect payment</Title>
            <Text size="sm" c="dimmed" fw={400}>
              This project is ready to bill. Send the client a payment link by email when you are
              ready.
            </Text>
          </Stack>
        </Stack>
      }
    >
      <Stack gap="lg" pt="xs">
        {helcimConfigured === null ? (
          <Center py="lg">
            <Loader size="sm" />
          </Center>
        ) : (
          <>
            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-body)">
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Email the client a payment link to your signed estimate page. They can review the
                  job and pay from any device.
                </Text>
                {helcimConfigured && (
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
                  disabled={!estimateId}
                  onClick={handleSendEmail}
                >
                  Collect via email
                </Button>
              </Stack>
            </Paper>
          </>
        )}
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
            This job is in Project billing needed. Send the client a payment link by email when you
            are ready.
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
          onClick={handleSendEmail}
        >
          Email payment link
        </Button>
        {onOpenModal ? (
          <Text
            size="xs"
            c="blue"
            ta="center"
            style={{ cursor: 'pointer' }}
            onClick={onOpenModal}
          >
            Open full payment dialog…
          </Text>
        ) : null}
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
