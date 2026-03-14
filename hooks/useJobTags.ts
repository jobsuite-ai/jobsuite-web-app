import { useEffect, useState } from 'react';

import { getApiHeaders } from '@/app/utils/apiClient';

export interface UseJobTagsOptions {
  /** When false, skips fetching (e.g. until auth is ready). Default true. */
  enabled?: boolean;
}

export function useJobTags(options: UseJobTagsOptions = {}) {
  const { enabled = true } = options;
  const [jobTags, setJobTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return () => {};
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchTags() {
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
  }, [enabled]);

  return { jobTags, loading, error };
}
