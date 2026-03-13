import { useEffect, useState } from 'react';

import { getApiHeaders } from '@/app/utils/apiClient';

export function useJobTags() {
  const [jobTags, setJobTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTags() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/job-tags', {
          method: 'GET',
          headers: getApiHeaders(),
        });
        if (!res.ok) {
          throw new Error('Failed to load job tags');
        }
        const data = await res.json();
        if (!cancelled && Array.isArray(data.job_tags)) {
          setJobTags(data.job_tags);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error('Failed to load job tags'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTags();
    return () => {
      cancelled = true;
    };
  }, []);

  return { jobTags, loading, error };
}
