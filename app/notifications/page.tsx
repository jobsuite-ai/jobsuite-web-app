'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Divider,
  Center,
} from '@mantine/core';
import { IconBell, IconCheck, IconClock, IconChevronDown } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import { getApiHeaders } from '@/app/utils/apiClient';
import LoadingState from '@/components/Global/LoadingState';
import UniversalError from '@/components/Global/UniversalError';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  user_id: string;
  contractor_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  delivery_status: string;
  delivery_method: string;
  created_at: string;
  updated_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth({ requireAuth: true });
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [showOlderNotifications, setShowOlderNotifications] = useState(false);
  const [hasFetchedAll, setHasFetchedAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const fetchNotifications = useCallback(
    async (includeOlder: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        // Calculate 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Build query parameters
        const params = new URLSearchParams();
        params.append('limit', '100');

        // Only filter by date if we're not including older notifications
        if (!includeOlder) {
          params.append('since_date', thirtyDaysAgo.toISOString());
        }

        const response = await fetch(`/api/notifications?${params.toString()}`, {
          method: 'GET',
          headers: getApiHeaders(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch notifications');
        }

        const data = await response.json();
        // Sort by created_at descending (newest first)
        const sorted = (data || []).sort((a: Notification, b: Notification) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setAllNotifications(sorted);
        setHasFetchedAll(includeOlder);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching notifications:', err);
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!authLoading) {
      fetchNotifications();
    }
  }, [authLoading, fetchNotifications]);

  const acknowledgeNotification = useCallback(async (notificationId: string) => {
    try {
      setAcknowledging(notificationId);
      const response = await fetch(`/api/notifications/${notificationId}/acknowledge`, {
        method: 'POST',
        headers: getApiHeaders(),
      });

      if (response.ok) {
        // Update the notification in the list
        setAllNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, is_acknowledged: true, acknowledged_at: new Date().toISOString() }
              : n
          )
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error acknowledging notification:', err);
    } finally {
      setAcknowledging(null);
    }
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }
    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (authLoading || loading) {
    return <LoadingState />;
  }

  if (error) {
    return <UniversalError message={error} />;
  }

  // Calculate 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Split notifications into recent (last 30 days) and older
  const recentNotifications = allNotifications.filter(
    (n) => new Date(n.created_at) >= thirtyDaysAgo
  );
  const olderNotifications = allNotifications.filter(
    (n) => new Date(n.created_at) < thirtyDaysAgo
  );

  // Split recent notifications by acknowledged status
  const recentUnacknowledged = recentNotifications.filter((n) => !n.is_acknowledged);
  const recentAcknowledged = recentNotifications.filter((n) => n.is_acknowledged);

  // Split older notifications by acknowledged status (only if showing older)
  const olderUnacknowledged = showOlderNotifications
    ? olderNotifications.filter((n) => !n.is_acknowledged)
    : [];
  const olderAcknowledged = showOlderNotifications
    ? olderNotifications.filter((n) => n.is_acknowledged)
    : [];

  // Show button if we haven't fetched all notifications yet
  // (i.e., we only fetched recent ones and there might be older ones)
  const shouldShowLoadOlderButton = !hasFetchedAll && allNotifications.length > 0;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Paper p="lg" radius="md" withBorder>
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <IconBell size={24} />
              <Title order={1}>Notifications</Title>
            </Group>
            {allNotifications.length > 0 && (
              <Group gap="xs">
                <Badge size="lg" color="blue" variant="light">
                  {recentNotifications.length} recent
                </Badge>
                {olderNotifications.length > 0 && (
                  <Badge size="lg" color="gray" variant="light">
                    {olderNotifications.length} older
                  </Badge>
                )}
              </Group>
            )}
          </Group>
        </Paper>

        {/* Recent Unacknowledged Notifications */}
        {recentUnacknowledged.length > 0 && (
          <Stack gap="md">
            <Group gap="sm">
              <IconClock size={20} color="var(--mantine-color-red-6)" />
              <Title order={2} size="h3">
                Unacknowledged ({recentUnacknowledged.length + olderUnacknowledged.length})
              </Title>
            </Group>
            {recentUnacknowledged.map((notification) => (
              <Paper
                key={notification.id}
                p="md"
                radius="md"
                withBorder
                style={{
                  cursor: notification.link ? 'pointer' : 'default',
                  borderLeft: '4px solid var(--mantine-color-red-6)',
                }}
                onClick={() => {
                  if (notification.link) {
                    const link = notification.link.replace('/estimates/', '/proposals/');
                    router.push(link);
                  }
                }}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Group gap="sm" align="center">
                        <Text size="md" fw={600} style={{ flex: 1 }}>
                          {notification.title}
                        </Text>
                        <Badge size="sm" color="red" variant="light">
                          New
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {notification.message}
                      </Text>
                      <Group gap="xs" mt={4}>
                        <Text size="xs" c="dimmed">
                          {formatDate(notification.created_at)}
                        </Text>
                        {notification.type && (
                          <>
                            <Text size="xs" c="dimmed">
                              •
                            </Text>
                            <Badge size="xs" variant="dot" color="gray">
                              {notification.type}
                            </Badge>
                          </>
                        )}
                      </Group>
                    </Stack>
                    <Button
                      variant="subtle"
                      size="sm"
                      leftSection={<IconCheck size={16} />}
                      loading={acknowledging === notification.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        acknowledgeNotification(notification.id);
                      }}
                    >
                      Acknowledge
                    </Button>
                  </Group>
                  {notification.link && (
                    <Text size="xs" c="blue" style={{ cursor: 'pointer' }}>
                      View details →
                    </Text>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Older Unacknowledged Notifications */}
        {showOlderNotifications && olderUnacknowledged.length > 0 && (
          <Stack gap="md">
            <Divider
              label={`Older than 30 days - Unacknowledged (${olderUnacknowledged.length})`}
              labelPosition="center"
              my="md"
            />
            {olderUnacknowledged.map((notification) => (
              <Paper
                key={notification.id}
                p="md"
                radius="md"
                withBorder
                style={{
                  cursor: notification.link ? 'pointer' : 'default',
                  borderLeft: '4px solid var(--mantine-color-red-6)',
                  opacity: 0.7,
                }}
                onClick={() => {
                  if (notification.link) {
                    const link = notification.link.replace('/estimates/', '/proposals/');
                    router.push(link);
                  }
                }}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Group gap="sm" align="center">
                        <Text size="md" fw={600} style={{ flex: 1 }}>
                          {notification.title}
                        </Text>
                        <Badge size="sm" color="red" variant="light">
                          New
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {notification.message}
                      </Text>
                      <Group gap="xs" mt={4}>
                        <Text size="xs" c="dimmed">
                          {formatDate(notification.created_at)}
                        </Text>
                        {notification.type && (
                          <>
                            <Text size="xs" c="dimmed">
                              •
                            </Text>
                            <Badge size="xs" variant="dot" color="gray">
                              {notification.type}
                            </Badge>
                          </>
                        )}
                      </Group>
                    </Stack>
                    <Button
                      variant="subtle"
                      size="sm"
                      leftSection={<IconCheck size={16} />}
                      loading={acknowledging === notification.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        acknowledgeNotification(notification.id);
                      }}
                    >
                      Acknowledge
                    </Button>
                  </Group>
                  {notification.link && (
                    <Text size="xs" c="blue" style={{ cursor: 'pointer' }}>
                      View details →
                    </Text>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Load Older Notifications Button */}
        {shouldShowLoadOlderButton && (
          <Center>
            <Button
              variant="light"
              leftSection={<IconChevronDown size={16} />}
              onClick={async () => {
                // Fetch all notifications including older ones
                await fetchNotifications(true);
                setShowOlderNotifications(true);
              }}
            >
              Load Older Notifications
            </Button>
          </Center>
        )}

        {/* Divider between sections */}
        {(recentUnacknowledged.length > 0 || olderUnacknowledged.length > 0) &&
          (recentAcknowledged.length > 0 || olderAcknowledged.length > 0) && (
            <Divider label="Acknowledged Notifications" labelPosition="center" my="md" />
          )}

        {/* Recent Acknowledged Notifications */}
        {recentAcknowledged.length > 0 && (
          <Stack gap="md">
            {(recentUnacknowledged.length === 0 && olderUnacknowledged.length === 0) && (
              <Group gap="sm">
                <IconCheck size={20} color="var(--mantine-color-gray-6)" />
                <Title order={2} size="h3">
                  Acknowledged ({recentAcknowledged.length + olderAcknowledged.length})
                </Title>
              </Group>
            )}
            {recentAcknowledged.map((notification) => (
              <Paper
                key={notification.id}
                p="md"
                radius="md"
                withBorder
                style={{
                  cursor: notification.link ? 'pointer' : 'default',
                  opacity: 0.8,
                  borderLeft: '4px solid var(--mantine-color-gray-4)',
                }}
                onClick={() => {
                  if (notification.link) {
                    const link = notification.link.replace('/estimates/', '/proposals/');
                    router.push(link);
                  }
                }}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Group gap="sm" align="center">
                        <Text size="md" fw={500} style={{ flex: 1 }}>
                          {notification.title}
                        </Text>
                        <Badge size="sm" color="gray" variant="light">
                          Acknowledged
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {notification.message}
                      </Text>
                      <Group gap="xs" mt={4}>
                        <Text size="xs" c="dimmed">
                          {formatDate(notification.created_at)}
                        </Text>
                        {notification.acknowledged_at && (
                          <>
                            <Text size="xs" c="dimmed">
                              •
                            </Text>
                            <Text size="xs" c="dimmed">
                              Acknowledged {formatDate(notification.acknowledged_at)}
                            </Text>
                          </>
                        )}
                        {notification.type && (
                          <>
                            <Text size="xs" c="dimmed">
                              •
                            </Text>
                            <Badge size="xs" variant="dot" color="gray">
                              {notification.type}
                            </Badge>
                          </>
                        )}
                      </Group>
                    </Stack>
                  </Group>
                  {notification.link && (
                    <Text size="xs" c="blue" style={{ cursor: 'pointer' }}>
                      View details →
                    </Text>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Older Acknowledged Notifications */}
        {showOlderNotifications && olderAcknowledged.length > 0 && (
          <Stack gap="md">
            {recentAcknowledged.length === 0 && (
              <Group gap="sm">
                <IconCheck size={20} color="var(--mantine-color-gray-6)" />
                <Title order={2} size="h3">
                  Acknowledged ({olderAcknowledged.length})
                </Title>
              </Group>
            )}
            {recentAcknowledged.length > 0 && olderAcknowledged.length > 0 && (
              <Divider
                label={`Older than 30 days - Acknowledged (${olderAcknowledged.length})`}
                labelPosition="center"
                my="md"
              />
            )}
            {olderAcknowledged.map((notification) => (
              <Paper
                key={notification.id}
                p="md"
                radius="md"
                withBorder
                style={{
                  cursor: notification.link ? 'pointer' : 'default',
                  opacity: 0.7,
                  borderLeft: '4px solid var(--mantine-color-gray-4)',
                }}
                onClick={() => {
                  if (notification.link) {
                    const link = notification.link.replace('/estimates/', '/proposals/');
                    router.push(link);
                  }
                }}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Group gap="sm" align="center">
                        <Text size="md" fw={500} style={{ flex: 1 }}>
                          {notification.title}
                        </Text>
                        <Badge size="sm" color="gray" variant="light">
                          Acknowledged
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {notification.message}
                      </Text>
                      <Group gap="xs" mt={4}>
                        <Text size="xs" c="dimmed">
                          {formatDate(notification.created_at)}
                        </Text>
                        {notification.acknowledged_at && (
                          <>
                            <Text size="xs" c="dimmed">
                              •
                            </Text>
                            <Text size="xs" c="dimmed">
                              Acknowledged {formatDate(notification.acknowledged_at)}
                            </Text>
                          </>
                        )}
                        {notification.type && (
                          <>
                            <Text size="xs" c="dimmed">
                              •
                            </Text>
                            <Badge size="xs" variant="dot" color="gray">
                              {notification.type}
                            </Badge>
                          </>
                        )}
                      </Group>
                    </Stack>
                  </Group>
                  {notification.link && (
                    <Text size="xs" c="blue" style={{ cursor: 'pointer' }}>
                      View details →
                    </Text>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Empty State */}
        {allNotifications.length === 0 && (
          <Paper p="xl" radius="md" withBorder>
            <Stack align="center" gap="md">
              <IconBell size={48} color="var(--mantine-color-gray-4)" />
              <Text size="lg" c="dimmed" ta="center">
                No notifications yet
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                You&apos;ll see notifications here when there are
                updates on your estimates, clients, or projects.
              </Text>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
