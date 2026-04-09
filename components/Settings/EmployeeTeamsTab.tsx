'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconEdit, IconPlus, IconTrash, IconX } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';
import type { User } from '@/components/Global/model';
import { useUsers } from '@/hooks/useUsers';

function userDisplayLabel(u: User): string {
  const base =
    (u.full_name && String(u.full_name).trim()) || u.email || u.id;
  return u.invitation_status === 'pending_invite' ? `${base} (pending)` : base;
}

type TeamCapacityRow = {
  hours_per_day: number;
  working_days: string;
  active_dates: string;
};

type Team = {
  id: string;
  name: string;
  team_config: { team_capacity: TeamCapacityRow[] };
  member_user_ids: string[];
  team_lead_user_id: string;
  description?: string | null;
};

const defaultCapacity = (): TeamCapacityRow[] => [
  {
    hours_per_day: 8,
    working_days: 'Mon,Tue,Wed,Thu,Fri',
    active_dates: '01/01 - 12/31',
  },
];

export default function EmployeeTeamsTab() {
  const { users, loading: loadingUsers } = useUsers();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [capacityRows, setCapacityRows] = useState<TeamCapacityRow[]>(defaultCapacity);
  const [saving, setSaving] = useState(false);
  const [teamIdPendingDelete, setTeamIdPendingDelete] = useState<string | null>(null);

  const memberOptions = useMemo(
    () =>
      users
        .filter((u: { role?: string }) => (u as { role?: string }).role !== 'client')
        .map((u) => ({
          value: u.id,
          label: userDisplayLabel(u as User),
        })),
    [users]
  );

  const leadOptions = useMemo(
    () => memberOptions.filter((o) => memberIds.includes(o.value)),
    [memberOptions, memberIds]
  );

  const userLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) {
      m.set(u.id, userDisplayLabel(u as User));
    }
    return m;
  }, [users]);

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/teams', { headers: getApiHeaders() });
      if (!res.ok) throw new Error('Failed to load teams');
      const data = await res.json();
      setTeams(Array.isArray(data) ? data : []);
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: e instanceof Error ? e.message : 'Load failed',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setMemberIds([]);
    setLeadId(null);
    setCapacityRows(defaultCapacity());
    setModalOpen(true);
  };

  const openEdit = (t: Team) => {
    setEditingId(t.id);
    setName(t.name);
    setMemberIds([...t.member_user_ids]);
    setLeadId(t.team_lead_user_id);
    const tc = t.team_config?.team_capacity;
    setCapacityRows(
      Array.isArray(tc) && tc.length
        ? tc.map((r) => ({
            hours_per_day: Number(r.hours_per_day),
            working_days: String(r.working_days),
            active_dates: String(r.active_dates),
          }))
        : defaultCapacity()
    );
    setModalOpen(true);
  };

  const saveTeam = async () => {
    if (!name.trim()) {
      notifications.show({ title: 'Name required', message: 'Enter a team name', color: 'yellow' });
      return;
    }
    if (memberIds.length < 1) {
      notifications.show({ title: 'Members required', message: 'Add at least one member', color: 'yellow' });
      return;
    }
    if (!leadId || !memberIds.includes(leadId)) {
      notifications.show({
        title: 'Team lead',
        message: 'Choose a lead who is on the team',
        color: 'yellow',
      });
      return;
    }
    for (const row of capacityRows) {
      if (!row.active_dates.trim() || row.hours_per_day <= 0) {
        notifications.show({
          title: 'Invalid capacity row',
          message: 'Each row needs hours > 0 and active_dates',
          color: 'yellow',
        });
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        team_config: { team_capacity: capacityRows },
        member_user_ids: memberIds,
        team_lead_user_id: leadId,
      };
      const url = editingId ? `/api/teams/${editingId}` : '/api/teams';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(payload),
      });
      const errBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(errBody.message || errBody.detail || 'Save failed');
      }
      notifications.show({
        title: 'Saved',
        message: editingId ? 'Team updated' : 'Team created',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      setModalOpen(false);
      await loadTeams();
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

  const confirmDeleteTeam = async () => {
    if (!teamIdPendingDelete) return;
    const id = teamIdPendingDelete;
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || 'Delete failed');
      }
      notifications.show({
        title: 'Deleted',
        message: 'Team removed',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      setTeamIdPendingDelete(null);
      await loadTeams();
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: e instanceof Error ? e.message : 'Delete failed',
        color: 'red',
      });
    }
  };

  const updateCapacityRow = (index: number, patch: Partial<TeamCapacityRow>) => {
    setCapacityRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addCapacityRow = () => {
    setCapacityRows((rows) => [
      ...rows,
      { hours_per_day: 8, working_days: 'Mon,Tue,Wed,Thu', active_dates: '01/01 - 03/31' },
    ]);
  };

  const removeCapacityRow = (index: number) => {
    setCapacityRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  };

  if (loading || loadingUsers) {
    return (
      <Text c="dimmed" size="sm">
        Loading teams…
      </Text>
    );
  }

  return (
    <Card shadow="sm" padding="lg" withBorder>
      <Group justify="space-between" mb="md">
        <div>
          <Text fw={600} size="lg">
            Employee teams
          </Text>
          <Text size="sm" c="dimmed" component="div">
            <span>Scheduling crews: crew size is the number of members.</span>{' '}
            <span>Configure hours and working days per date range.</span>
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          New team
        </Button>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th style={{ minWidth: 280 }}>Members</Table.Th>
            <Table.Th>Lead</Table.Th>
            <Table.Th style={{ width: 120 }} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {teams.map((t) => {
            const leadUser = users.find((u) => u.id === t.team_lead_user_id);
            const memberNames =
              t.member_user_ids.length === 0
                ? '—'
                : t.member_user_ids.map((id) => userLabelById.get(id) ?? id).join(', ');
            return (
              <Table.Tr key={t.id}>
                <Table.Td>{t.name}</Table.Td>
                <Table.Td style={{ maxWidth: 480, verticalAlign: 'top' }}>
                  <Text size="sm" style={{ whiteSpace: 'normal' }}>
                    {memberNames}
                  </Text>
                </Table.Td>
                <Table.Td>{leadUser?.full_name || leadUser?.email || t.team_lead_user_id}</Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <ActionIcon variant="subtle" onClick={() => openEdit(t)} aria-label="Edit">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => setTeamIdPendingDelete(t.id)}
                      aria-label="Delete"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      {teams.length === 0 && (
        <Text c="dimmed" size="sm" mt="md">
          No teams yet. Create one to use team-based scheduling.
        </Text>
      )}

      <Modal
        opened={teamIdPendingDelete !== null}
        onClose={() => setTeamIdPendingDelete(null)}
        title="Delete team?"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">This team will be removed. Jobs referencing it may need to be rescheduled.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setTeamIdPendingDelete(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={confirmDeleteTeam}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit team' : 'New team'}
        size="lg"
      >
        <Stack gap="md">
          <TextInput label="Team name" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
          <MultiSelect
            label="Members"
            description="Crew size = number of members selected"
            data={memberOptions}
            value={memberIds}
            onChange={(v) => {
              setMemberIds(v);
              if (leadId && !v.includes(leadId)) setLeadId(null);
            }}
            searchable
          />
          <Select
            label="Team lead"
            description="Must be one of the members"
            data={leadOptions}
            value={leadId}
            onChange={(v) => setLeadId(v)}
            searchable
            clearable
          />
          <Text fw={500} size="sm">
            Capacity windows
          </Text>
          {capacityRows.map((row, i) => (
            <Group key={i} align="flex-end" wrap="nowrap" grow>
              <NumberInput
                label="Hours / day"
                min={0.5}
                step={0.5}
                value={row.hours_per_day}
                onChange={(v) => updateCapacityRow(i, { hours_per_day: Number(v) || 0 })}
              />
              <TextInput
                label="Working days"
                placeholder="Mon,Tue,Wed,Thu"
                value={row.working_days}
                onChange={(e) => updateCapacityRow(i, { working_days: e.currentTarget.value })}
              />
              <TextInput
                label="Active dates"
                placeholder="MM/DD - MM/DD"
                value={row.active_dates}
                onChange={(e) => updateCapacityRow(i, { active_dates: e.currentTarget.value })}
              />
              <ActionIcon
                color="red"
                variant="light"
                onClick={() => removeCapacityRow(i)}
                disabled={capacityRows.length <= 1}
                mt="xl"
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
          <Button variant="light" size="xs" onClick={addCapacityRow}>
            Add capacity window
          </Button>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTeam} loading={saving}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
