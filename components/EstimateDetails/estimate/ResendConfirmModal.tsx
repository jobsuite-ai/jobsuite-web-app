'use client';

import { Modal, Button, Text, Group } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ResendConfirmModalProps {
    opened: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading?: boolean;
}

export function ResendConfirmModal({
    opened,
    onClose,
    onConfirm,
    loading = false,
}: ResendConfirmModalProps) {
    return (
        <Modal
          opened={opened}
          onClose={onClose}
          title={
                <Group gap="xs">
                    <IconAlertTriangle size={20} color="orange" />
                    <Text fw={600}>Confirm Re-send Estimate</Text>
                </Group>
            }
          centered
        >
            <Text size="sm" mb="md">
                This estimate has already been sent. Re-sending will invalidate any existing
                signatures on this estimate.
            </Text>
            <Text size="sm" c="dimmed" mb="lg">
                Are you sure you want to continue?
            </Text>
            <Group justify="flex-end" mt="md">
                <Button variant="subtle" onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button color="orange" onClick={onConfirm} loading={loading}>
                    Re-send Estimate
                </Button>
            </Group>
        </Modal>
    );
}
