'use client';

import { useMemo, useState } from 'react';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconMailPlus, IconPencil, IconPlus, IconX } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';
import type { User } from '@/components/Global/model';
import { useAuth } from '@/hooks/useAuth';
import { TEAM_ASSIGNMENT_ROLE_OPTIONS } from '@/hooks/useTeamAssignmentPools';
import { useUsers } from '@/hooks/useUsers';

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'lead-painter', label: 'Lead painter' },
  { value: 'support-painter', label: 'Support painter' },
  { value: 'employee', label: 'Employee (legacy)' },
];

function isPendingInvite(u: User): boolean {
  return u.invitation_status === 'pending_invite';
}

function statusLabel(u: User): string {
  return isPendingInvite(u) ? 'Needs invite' : 'Active';
}

export default function EmployeeRosterCard() {
  const { users, loading, refetch } = useUsers();
  const { user: currentUser } = useAuth({ fetchUser: true });
  const isAdmin = currentUser?.role === 'admin';
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [savingRolesId, setSavingRolesId] = useState<string | null>(null);
  const [savingQbId, setSavingQbId] = useState(false);
  const [qbModalUser, setQbModalUser] = useState<User | null>(null);
  const [qbModalValue, setQbModalValue] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string | null>('lead-painter');

  const rosterUsers = useMemo(
    () => users.filter((u) => u.role !== 'client'),
    [users]
  );

  const jobRoleOptions = useMemo(
    () => TEAM_ASSIGNMENT_ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    []
  );

  const openCreate = () => {
    setFullName('');
    setEmail('');
    setRole('lead-painter');
    setModalOpen(true);
  };

  const saveEmployee = async () => {
    const name = fullName.trim();
    const em = email.trim();
    if (!name) {
      notifications.show({ title: 'Name required', message: 'Enter a full name', color: 'yellow' });
      return;
    }
    if (!em) {
      notifications.show({ title: 'Email required', message: 'Enter an email address', color: 'yellow' });
      return;
    }
    if (!role) {
      notifications.show({ title: 'Role required', message: 'Choose a role', color: 'yellow' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/users/pending', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          email: em,
          full_name: name,
          role,
        }),
      });
      const errBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(errBody.message || errBody.detail || 'Save failed');
      }
      notifications.show({
        title: 'Employee added',
        message: 'They can be added to teams. Send an invite when they should log in.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      setModalOpen(false);
      refetch();
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: e instanceof Error ? e.message : 'Save failed',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setSaving(false);
    }
  };

  const sendInvite = async (u: User) => {
    if (!u.full_name || !u.role) {
      notifications.show({
        title: 'Missing data',
        message: 'User record must include name and role to send an invite.',
        color: 'yellow',
      });
      return;
    }
    setSendingId(u.id);
    try {
      const res = await fetch('/api/users/send-invite', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          email: u.email,
          full_name: u.full_name,
          role: u.role,
        }),
      });
      const errBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(errBody.message || errBody.detail || 'Send failed');
      }
      notifications.show({
        title: 'Invite sent',
        message: `Check ${u.email} for the setup link.`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      refetch();
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: e instanceof Error ? e.message : 'Send failed',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setSendingId(null);
    }
  };

  const saveJobRoles = async (userId: string, team_assignment_roles: string[]) => {
    setSavingRolesId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: getApiHeaders(),
        body: JSON.stringify({ team_assignment_roles }),
      });
      const errBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(errBody.message || errBody.detail || 'Update failed');
      }
      refetch();
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: e instanceof Error ? e.message : 'Update failed',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setSavingRolesId(null);
    }
  };

  const openQbModal = (u: User) => {
    setQbModalUser(u);
    setQbModalValue(u.quickbooks_employee_id?.trim() ?? '');
  };

  const closeQbModal = () => {
    setQbModalUser(null);
    setQbModalValue('');
  };

  const saveQuickbooksEmployeeId = async () => {
    if (!qbModalUser) return;
    const userId = qbModalUser.id;
    setSavingQbId(true);
    try {
      const trimmed = qbModalValue.trim();
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: getApiHeaders(),
        body: JSON.stringify({
          quickbooks_employee_id: trimmed.length > 0 ? trimmed : null,
        }),
      });
      const errBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(errBody.message || errBody.detail || 'Update failed');
      }
      notifications.show({
        title: 'Saved',
        message: trimmed.length > 0 ? 'QuickBooks employee ID updated' : 'QuickBooks employee ID cleared',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      closeQbModal();
      refetch();
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: e instanceof Error ? e.message : 'Update failed',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setSavingQbId(false);
    }
  };

  if (loading) {
    return (
      <Card shadow="sm" padding="lg" withBorder>
        <Text c="dimmed" size="sm">
          Loading roster…
        </Text>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="lg" withBorder>
      <Group justify="space-between" mb="md">
        <div>
          <Text fw={600} size="lg">
            Employee roster
          </Text>
          <Text size="sm" c="dimmed" component="div">
            Add people to your contractor account. <strong>Job crew lead</strong> on estimates is
            anyone with login role Lead painter or Support painter. Pick at most one{' '}
            <strong>Job role</strong> (production manager, sales, or office manager) for estimates
            and routing. This is separate from login <strong>Role</strong> (permissions).
            {isAdmin && (
              <>
                {' '}
                <strong>QuickBooks employee ID</strong> (admins only) maps each person to a
                QuickBooks Employee for posting time.
              </>
            )}
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Add employee
        </Button>
      </Group>

      <Table striped highlightOnHover layout="fixed">
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: '18%' }}>Name</Table.Th>
            <Table.Th style={{ width: '22%' }}>Email</Table.Th>
            <Table.Th style={{ width: '14%' }}>Role</Table.Th>
            <Table.Th>Job role</Table.Th>
            <Table.Th style={{ width: 130 }}>QuickBooks</Table.Th>
            <Table.Th style={{ width: '10%' }}>Access</Table.Th>
            <Table.Th style={{ width: 140 }} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rosterUsers.map((u) => (
            <Table.Tr key={u.id}>
              <Table.Td>{u.full_name || '—'}</Table.Td>
              <Table.Td style={{ wordBreak: 'break-word' }}>{u.email}</Table.Td>
              <Table.Td>{u.role || '—'}</Table.Td>
              <Table.Td>
                <Select
                  size="xs"
                  placeholder="None"
                  data={jobRoleOptions}
                  value={u.team_assignment_roles?.[0] ?? null}
                  onChange={(next) => saveJobRoles(u.id, next ? [next] : [])}
                  searchable
                  clearable
                  disabled={savingRolesId === u.id}
                  comboboxProps={{ withinPortal: true }}
                />
              </Table.Td>
              <Table.Td>
                <Group gap="xs" wrap="nowrap" align="center">
                  <Badge
                    size="sm"
                    color={u.quickbooks_employee_id ? 'teal' : 'gray'}
                    variant="light"
                  >
                    {u.quickbooks_employee_id ? 'Set' : 'Not set'}
                  </Badge>
                  {isAdmin && (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label={
                        u.quickbooks_employee_id
                          ? 'Edit QuickBooks employee ID'
                          : 'Set QuickBooks employee ID'
                      }
                      onClick={() => openQbModal(u)}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>
                <Badge color={isPendingInvite(u) ? 'yellow' : 'green'} variant="light">
                  {statusLabel(u)}
                </Badge>
              </Table.Td>
              <Table.Td>
                {isPendingInvite(u) ? (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconMailPlus size={14} />}
                    loading={sendingId === u.id}
                    onClick={() => sendInvite(u)}
                  >
                    Send invite
                  </Button>
                ) : (
                  <Text size="xs" c="dimmed">
                    —
                  </Text>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {rosterUsers.length === 0 && (
        <Text c="dimmed" size="sm" mt="md">
          No employees yet. Add someone to get started.
        </Text>
      )}

      <Modal
        opened={qbModalUser !== null}
        onClose={closeQbModal}
        title="QuickBooks employee ID"
        size="md"
        centered
      >
        <Stack gap="md">
          {qbModalUser && (
            <Text size="sm" c="dimmed">
              {qbModalUser.full_name || qbModalUser.email}
            </Text>
          )}
          <TextInput
            label="Employee ID in QuickBooks"
            description="Paste the QuickBooks Employee Id from your connected company (sandbox or production)."
            placeholder="e.g. 42"
            value={qbModalValue}
            onChange={(e) => setQbModalValue(e.currentTarget.value)}
            autoFocus
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={closeQbModal}>
              Cancel
            </Button>
            <Button
              variant="light"
              color="red"
              onClick={() => {
                setQbModalValue('');
              }}
            >
              Clear
            </Button>
            <Button onClick={saveQuickbooksEmployeeId} loading={savingQbId}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add employee"
        size="md"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
          <Select
            label="Role"
            data={ROLE_OPTIONS}
            value={role}
            onChange={(v) => setRole(v)}
            required
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEmployee} loading={saving}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
