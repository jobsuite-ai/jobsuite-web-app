'use client';

import { useEffect, useRef, useState } from 'react';

import { Carousel } from '@mantine/carousel';
import {
    Badge,
    Button,
    Container,
    Grid,
    Group,
    Paper,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import {
    IconBell,
    IconChartBar,
    IconFileText,
    IconPlus,
    IconUsers,
} from '@tabler/icons-react';
import { motion, useInView } from 'framer-motion';
import { useRouter } from 'next/navigation';

import HomepageJobCard from './HomepageJobCard';
import { MetricCard } from '../Dashboard/MetricCard';
import LoadingState from '../Global/LoadingState';
import UniversalError from '../Global/UniversalError';

import { getApiHeaders } from '@/app/utils/apiClient';
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

interface HomepageEstimate {
  id: string;
  title?: string;
  client_name: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  status: string;
  hours_bid: number;
  hourly_rate: number;
  cover_photo_resource_id?: string;
  cover_photo_url?: string;
  updated_at: string;
  created_at: string;
  sold_date?: string;
  started_date?: string;
  finished_date?: string;
}

interface HomepageMetrics {
  estimates_this_month: number;
  signed_this_month: number;
  revenue_this_month: number;
  conversion_rate: number;
  average_estimate_value: number;
  active_projects: number;
}

interface HomepageData {
  notifications: any[];
  in_progress_jobs: HomepageEstimate[];
  metrics: HomepageMetrics;
  recently_sold: HomepageEstimate[];
  recently_finished: HomepageEstimate[];
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

// Scroll-triggered animation component
function AnimatedSection({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={itemVariants}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export default function Homepage() {
  const router = useRouter();
  const { user } = useAuth({ fetchUser: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HomepageData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Extract first name from full_name
  const getFirstName = () => {
    if (user?.full_name) {
      return user.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return null;
  };

  useEffect(() => {
    async function fetchHomepageData() {
      try {
        setLoading(true);
        setError(null);

        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch('/api/homepage', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch homepage data');
        }

        const homepageData = await response.json();
        setData(homepageData);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching homepage data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load homepage');
      } finally {
        setLoading(false);
      }
    }

    fetchHomepageData();
  }, []);

  // Fetch notifications
  useEffect(() => {
    async function fetchNotifications() {
      try {
        setNotificationsLoading(true);
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
          return;
        }

        const response = await fetch('/api/notifications/unacknowledged/list?limit=5', {
          method: 'GET',
          headers: getApiHeaders(),
        });

        if (response.ok) {
          const notificationsData = await response.json();
          setNotifications(notificationsData || []);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching notifications:', err);
      } finally {
        setNotificationsLoading(false);
      }
    }

    if (!loading && !error) {
      fetchNotifications();
    }
  }, [loading, error]);

  // Acknowledge notification
  const acknowledgeNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/acknowledge`, {
        method: 'POST',
        headers: getApiHeaders(),
      });

      if (response.ok) {
        // Remove from list
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error acknowledging notification:', err);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <UniversalError message={error || 'Failed to load homepage'} />;
  }

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate quick stat (estimates needing attention)
  const needsAttention = data.in_progress_jobs.length;

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Hero Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="sm">
              <Title order={1} fw={900}>
                Welcome back{getFirstName() ? `, ${getFirstName()}` : ''}!
              </Title>
              <Text size="lg" c="dimmed">
                {formattedDate}
              </Text>
              {needsAttention > 0 && (
                <Text size="md" c="blue" fw={500}>
                  {needsAttention} {needsAttention === 1 ? 'job' : 'jobs'} in progress
                </Text>
              )}
            </Stack>
          </Paper>
        </motion.div>

        {/* Quick Actions */}
        <AnimatedSection delay={0.1}>
          <Group gap="md">
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => router.push('/add-proposal')}
            >
              Create Estimate
            </Button>
            <Button
              leftSection={<IconUsers size={18} />}
              variant="light"
              onClick={() => router.push('/clients')}
            >
              Add Client
            </Button>
            <Button
              leftSection={<IconFileText size={18} />}
              variant="light"
              onClick={() => router.push('/proposals')}
            >
              View All Estimates
            </Button>
            <Button
              leftSection={<IconChartBar size={18} />}
              variant="light"
              onClick={() => router.push('/dashboard')}
            >
              View Dashboard
            </Button>
          </Group>
        </AnimatedSection>

        {/* Action Center (Notifications) */}
        <AnimatedSection delay={0.2}>
          <Paper p="lg" radius="md" withBorder>
            <Group gap="sm" mb="md">
              <IconBell size={20} />
              <Title order={3}>Action Center</Title>
              {notifications.length > 0 && (
                <Badge size="sm" color="red" variant="light">
                  {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
                </Badge>
              )}
            </Group>
            {notificationsLoading ? (
              <Text c="dimmed" size="sm">
                Loading notifications...
              </Text>
            ) : notifications.length === 0 ? (
              <Text c="dimmed" size="sm">
                No new notifications
              </Text>
            ) : (
              <Stack gap="sm">
                {notifications.map((notification) => (
                  <Paper
                    key={notification.id}
                    p="md"
                    radius="sm"
                    withBorder
                    style={{ cursor: notification.link ? 'pointer' : 'default' }}
                    onClick={() => {
                      acknowledgeNotification(notification.id);
                      if (notification.link) {
                        router.push(notification.link);
                      }
                    }}
                  >
                    <Stack gap={4}>
                      <Group justify="space-between" align="flex-start">
                        <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1 }}>
                          {notification.title}
                        </Text>
                        <Button
                          variant="subtle"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgeNotification(notification.id);
                          }}
                        >
                          Dismiss
                        </Button>
                      </Group>
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {notification.message}
                      </Text>
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
          </Paper>
        </AnimatedSection>

        {/* Key Metrics */}
        <AnimatedSection delay={0.3}>
          <Title order={2} mb="md" c="gray.1">
            Key Metrics
          </Title>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <MetricCard
                title="New Leads This Month"
                value={data.metrics.estimates_this_month.toString()}
                description="New estimates created this month"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <MetricCard
                title="Signed This Month"
                value={data.metrics.signed_this_month.toString()}
                description="Estimates signed this month"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <MetricCard
                title="Revenue This Month"
                value={`$${data.metrics.revenue_this_month.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Total revenue from signed estimates"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <MetricCard
                title="Conversion Rate"
                value={`${data.metrics.conversion_rate.toFixed(1)}%`}
                description="Percentage of estimates signed this month"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 6 }}>
              <MetricCard
                title="Average Estimate Value"
                value={`$${data.metrics.average_estimate_value.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Average revenue per signed estimate this month"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 6 }}>
              <MetricCard
                title="Active Projects"
                value={data.metrics.active_projects.toString()}
                description="Projects currently in progress"
              />
            </Grid.Col>
          </Grid>
        </AnimatedSection>

        {/* In Progress Jobs */}
        {data.in_progress_jobs.length > 0 && (
          <AnimatedSection delay={0.4}>
            <Group justify="space-between" mb="md">
              <Title order={2} c="gray.1">In Progress Jobs</Title>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => router.push('/projects')}
              >
                View All
              </Button>
            </Group>
            <Grid gutter="md">
              {data.in_progress_jobs.map((job, index) => (
                <Grid.Col key={job.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-50px' }}
                    variants={itemVariants}
                    transition={{ delay: index * 0.05 }}
                  >
                    <HomepageJobCard {...job} />
                  </motion.div>
                </Grid.Col>
              ))}
            </Grid>
          </AnimatedSection>
        )}

        {/* Recently Sold */}
        {data.recently_sold.length > 0 && (
          <AnimatedSection delay={0.5}>
            <Group justify="space-between" mb="md">
              <Title order={2} c="gray.1">Recently Sold</Title>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => router.push('/proposals')}
              >
                View All
              </Button>
            </Group>
            <Carousel
              slideSize={{ base: '100%', sm: '50%', md: '33.333333%', lg: '25%' }}
              slideGap="md"
              align="start"
              slidesToScroll={1}
              withIndicators
            >
              {data.recently_sold.map((job) => (
                <Carousel.Slide key={job.id}>
                  <HomepageJobCard {...job} />
                </Carousel.Slide>
              ))}
            </Carousel>
          </AnimatedSection>
        )}

        {/* Recently Finished */}
        {data.recently_finished.length > 0 && (
          <AnimatedSection delay={0.6}>
            <Group justify="space-between" mb="md">
              <Title order={2}>Recently Finished</Title>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => router.push('/projects')}
              >
                View All
              </Button>
            </Group>
            <Grid gutter="md">
              {data.recently_finished.map((job, index) => (
                <Grid.Col key={job.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-50px' }}
                    variants={itemVariants}
                    transition={{ delay: index * 0.05 }}
                  >
                    <HomepageJobCard {...job} />
                  </motion.div>
                </Grid.Col>
              ))}
            </Grid>
          </AnimatedSection>
        )}

        {/* Empty States */}
        {data.in_progress_jobs.length === 0 &&
          data.recently_sold.length === 0 &&
          data.recently_finished.length === 0 && (
            <AnimatedSection delay={0.3}>
              <Paper p="xl" radius="md" withBorder>
                <Stack align="center" gap="md">
                  <Text size="lg" c="dimmed" ta="center">
                    No jobs to display yet. Create your first estimate to get started!
                  </Text>
                  <Button
                    leftSection={<IconPlus size={18} />}
                    onClick={() => router.push('/add-proposal')}
                  >
                    Create Estimate
                  </Button>
                </Stack>
              </Paper>
            </AnimatedSection>
          )}
      </Stack>
    </Container>
  );
}
