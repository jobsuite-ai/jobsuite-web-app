import { getApiHeaders } from '@/app/utils/apiClient';
import { EstimateStatus } from '@/components/Global/model';

type ScheduleRow = { id?: string };

export type AssignTeamResult = 'scheduled' | 'tentative' | 'unassigned';

/**
 * Change the job's team assignment.
 *
 * Behavior:
 * - If the job has an existing schedule row and a new team is chosen, keep it scheduled and
 *   move that schedule row to the new team.
 * - If the job has no schedule row and a team is chosen, it will live in that team's tentative
 *   backlog.
 * - If the team is cleared, remove scheduling and move it to Not assigned yet.
 * Updates the primary schedule row in place (PUT) instead of deleting and recreating it.
 */
export async function assignEstimateTeamOrUnassign(
  estimateId: string,
  teamId: string | null
): Promise<AssignTeamResult> {
  const listRes = await fetch(`/api/schedule/estimates/${estimateId}`, {
    headers: getApiHeaders(),
  });
  const rows = (await listRes.json().catch(() => [])) as ScheduleRow[];
  if (!Array.isArray(rows)) {
    throw new Error('Invalid schedule response');
  }

  if (rows.length > 0) {
    if (teamId) {
      const primary = rows[0];
      const pid = primary?.id;
      if (!pid) {
        throw new Error('Schedule row missing id');
      }
      const putRes = await fetch(`/api/schedule/${pid}`, {
        method: 'PUT',
        headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
        }),
      });
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(
          (typeof err.message === 'string' && err.message) ||
            (typeof err.detail === 'string' && err.detail) ||
            'Failed to reassign team on schedule'
        );
      }
      for (const row of rows.slice(1)) {
        const rid = row?.id;
        if (rid) {
          await fetch(`/api/schedule/${rid}`, {
            method: 'DELETE',
            headers: getApiHeaders(),
          });
        }
      }

      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({
          schedule_team_id: teamId,
        }),
      });
      const errBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (typeof errBody.message === 'string' && errBody.message) ||
            (typeof errBody.detail === 'string' && errBody.detail) ||
            'Failed to update estimate'
        );
      }
      return 'scheduled';
    }
      for (const row of rows) {
        const id = row?.id;
        if (id) {
          const del = await fetch(`/api/schedule/${id}`, {
            method: 'DELETE',
            headers: getApiHeaders(),
          });
          if (!del.ok) {
            const err = await del.json().catch(() => ({}));
            throw new Error(
              (typeof err.message === 'string' && err.message) ||
                (typeof err.detail === 'string' && err.detail) ||
                'Failed to remove schedule'
            );
          }
        }
      }

      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({
          status: EstimateStatus.PROJECT_NOT_SCHEDULED,
          schedule_team_id: null,
        }),
      });
      const errBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (typeof errBody.message === 'string' && errBody.message) ||
            (typeof errBody.detail === 'string' && errBody.detail) ||
            'Failed to update estimate'
        );
      }
      return 'unassigned';
  }

  if (teamId) {
    const res = await fetch(`/api/estimates/${estimateId}`, {
      method: 'PUT',
      headers: getApiHeaders(),
      body: JSON.stringify({
        status: EstimateStatus.PROJECT_NOT_SCHEDULED,
        schedule_team_id: teamId,
      }),
    });
    const errBody = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (typeof errBody.message === 'string' && errBody.message) ||
          (typeof errBody.detail === 'string' && errBody.detail) ||
          'Failed to update estimate'
      );
    }
    return 'tentative';
  }

  // No schedule rows and team cleared — nothing to do.
  return 'unassigned';
}
