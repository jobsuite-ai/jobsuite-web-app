import { getApiHeaders } from '@/app/utils/apiClient';

/** Short TTL + in-flight dedupe to cut duplicate Messaging Center / Header traffic */
const LIST_TTL_MS = 45_000;
const COUNT_TTL_MS = 45_000;

const inFlightList = new Map<string, Promise<unknown>>();
const listCache = new Map<string, { data: unknown; expires: number }>();

const COUNT_KEY = 'count';
const inFlightCount = new Map<string, Promise<unknown>>();
const countCache = new Map<string, { data: unknown; expires: number }>();

export function invalidateOutreachMessageCaches(): void {
    listCache.clear();
    countCache.clear();
}

export async function fetchCachedOutreachMessagesList<T>(url: string): Promise<T> {
    const now = Date.now();
    const cached = listCache.get(url);
    if (cached && cached.expires > now) {
        return cached.data as T;
    }

    let p = inFlightList.get(url);
    if (!p) {
        p = (async () => {
            const response = await fetch(url, {
                method: 'GET',
                headers: getApiHeaders(),
            });
            if (!response.ok) {
                throw new Error('Failed to load messages');
            }
            const data = await response.json();
            listCache.set(url, { data, expires: Date.now() + LIST_TTL_MS });
            return data;
        })().finally(() => {
            inFlightList.delete(url);
        });
        inFlightList.set(url, p);
    }
    return p as Promise<T>;
}

export async function fetchCachedOutreachMessagesCount(): Promise<{
    count: number;
    past_due_count?: number;
}> {
    const now = Date.now();
    const cached = countCache.get(COUNT_KEY);
    if (cached && cached.expires > now) {
        return cached.data as { count: number; past_due_count?: number };
    }

    let p = inFlightCount.get(COUNT_KEY);
    if (!p) {
        p = (async () => {
            const response = await fetch('/api/outreach-messages/count', {
                method: 'GET',
                headers: getApiHeaders(),
            });
            if (!response.ok) {
                throw new Error('Failed to load count');
            }
            const data = await response.json();
            countCache.set(COUNT_KEY, {
                data,
                expires: Date.now() + COUNT_TTL_MS,
            });
            return data;
        })().finally(() => {
            inFlightCount.delete(COUNT_KEY);
        });
        inFlightCount.set(COUNT_KEY, p);
    }
    return p as Promise<{ count: number; past_due_count?: number }>;
}
