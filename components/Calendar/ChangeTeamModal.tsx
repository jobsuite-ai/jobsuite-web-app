'use client';

import { useEffect, useState } from 'react';

import { Button, Group, Modal, Select, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import type { CalendarTeamOption } from './ScheduleJobModal';

import type { Estimate } from '@/components/Global/model';
import { assignEstimateTeamOrUnassign } from '@/utils/scheduleEstimateTeamActions';

type Props = {
  opened: boolean;
  onClose: () => void;
  estimate: Estimate | null;
  teams: CalendarTeamOption[];
  teamsLoading: boolean;
  /** Team currently associated with this job (backlog or locked bar), if any */
  currentTeamId: string | null;
  /** Called after save; nextTeamId is the destination team (or null when unassigning). */
  onSaved: (nextTeamId: string | null) => void;
};

export function ChangeTeamModal({
  opened,
  onClose,
  estimate,
  teams,
  teamsLoading,
  currentTeamId,
  onSaved,
}: Props) {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!opened || !estimate) {
      return;
    }
    setTeamId(currentTeamId);
  }, [opened, estimate, currentTeamId]);

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  const handleSave = async () => {
    if (!estimate) {
      return;
    }
    setSaving(true);
    try {
      const result = await assignEstimateTeamOrUnassign(
        estimate.id,
        teamId?.trim() ? teamId : null
      );
      notifications.show({
        title: teamId ? 'Team updated' : 'Team removed',
        message:
          result === 'scheduled'
            ? 'The job stayed scheduled and was moved to the new team.'
            : result === 'tentative'
              ? 'The job is in the new team’s tentative backlog.'
              : 'The job is back in Not assigned yet.',
        color: 'green',
      });
      const nextTeamId = teamId?.trim() ? teamId : null;
      onSaved(nextTeamId);
      onClose();
    } catch (e) {
      notifications.show({
        title: 'Could not update team',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Change team" size="sm">
      {estimate ? (
        <Stack gap="md">
          <Text size="sm">
            {estimate.title || estimate.address_street || 'Job'}.
            {teamId
              ? ' If this job is already scheduled, it will stay scheduled in the same spot for the new team. If it’s not scheduled yet, it will be placed in that team’s tentative backlog.'
              : ' Removing the team moves the job to Not assigned yet.'}
          </Text>
          <Select
            label="Production team"
            placeholder={teamsLoading ? 'Loading teams…' : 'No team (unassign)'}
            data={teamOptions}
            value={teamId}
            onChange={setTeamId}
            searchable
            clearable
            disabled={teamsLoading}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => handleSave().catch(() => {})}>
              Save
            </Button>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  );
}
