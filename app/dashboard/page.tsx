'use client';

import { useEffect, useMemo, useState } from 'react';

import { Anchor, Button, Center, Container, Grid, Group, Loader, Modal, NumberInput, Paper, Select, Skeleton, Stack, Table, Tabs, Text, Title } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import { getApiHeaders } from '@/app/utils/apiClient';
import { BarChart, LineChart, PieChart } from '@/components/Dashboard/Charts';
import { MetricCard } from '@/components/Dashboard/MetricCard';
import { useAuth } from '@/hooks/useAuth';
import { logToCloudWatch } from '@/public/logger';

const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CategoryValue {
  category: string;
  value: number;
}

interface TimeDataPoint {
  date: string;
  value: number;
}

interface StatusTrendPoint {
  date: string;
  New: number;
  InProgress: number;
  Completed: number;
  [key: string]: string | number;
}

interface CrewLeadHours {
  crewLead: string;
  estimatedHours: number;
  actualHours: number;
}

interface JobWithHourDifference {
  id: string;
  name: string;
  estimatedHours: number;
  actualHours: number;
  difference: number;
  differencePercentage: number;
  updatedAt: string;
  crewLead: string;
}

interface RecentlySoldJob {
  id: string;
  name: string;
  estimatedHours: number;
  soldDate: string;
}

interface UpcomingFollowUp {
  id: string;
  name: string;
  follow_up_date: string;
  client_address: string;
  city: string;
  state: string;
  zip_code: string;
}
interface DashboardMetrics {
  totalJobs: number;
  activeBids: number;
  totalBidValue: number;
  totalSoldValue: number;
  conversionRate: number;
  averageBidAmount: number;
  inProgressValue: number;
  inProgressJobsCount: number;
  statusCounts: Record<string, number>;
  revenueByWeek: TimeDataPoint[];
  jobsByWeek: TimeDataPoint[];
  bidToSoldData: CategoryValue[];
  statusTrend: StatusTrendPoint[];
  referralSources: CategoryValue[];
  acceptedReferralSources: CategoryValue[];
  totalEstimatedHours: number;
  totalActualHours: number;
  crewLeadHours: CrewLeadHours[];
  jobsWithHourDifferences: JobWithHourDifference[];
  recentlySoldJobs: RecentlySoldJob[];
  currentMonthJobs: number;
  currentMonthHours: number;
  hoursLeftToSell: number;
  hoursLeftLastUpdated: string | null;
  upcomingFollowUps: UpcomingFollowUp[];
}

export default function Dashboard() {
  const { isLoading: isAuthLoading } = useAuth({ requireAuth: true });
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState('ytd'); // Default to year to date
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editHoursModalOpen, setEditHoursModalOpen] = useState(false);
  const [editingHoursValue, setEditingHoursValue] = useState(0);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalJobs: 0,
    activeBids: 0,
    totalBidValue: 0,
    totalSoldValue: 0,
    conversionRate: 0,
    averageBidAmount: 0,
    inProgressValue: 0,
    inProgressJobsCount: 0,
    statusCounts: {},
    revenueByWeek: [],
    jobsByWeek: [],
    bidToSoldData: [],
    statusTrend: [],
    referralSources: [],
    acceptedReferralSources: [],
    totalEstimatedHours: 0,
    totalActualHours: 0,
    crewLeadHours: [],
    jobsWithHourDifferences: [],
    recentlySoldJobs: [],
    currentMonthJobs: 0,
    currentMonthHours: 0,
    hoursLeftToSell: 0,
    hoursLeftLastUpdated: null,
    upcomingFollowUps: [],
  });

  const availableMonths = useMemo(() => {
    const seen = new Set<number>();
    const months: number[] = [];
    const addMonthFromDate = (dateValue?: string) => {
      if (!dateValue) {
        return;
      }
      const monthToken = dateValue.split(' ')[0];
      const monthIndex = MONTH_ABBREVIATIONS.indexOf(monthToken);
      if (monthIndex >= 0 && !seen.has(monthIndex)) {
        seen.add(monthIndex);
        months.push(monthIndex);
      }
    };

    metrics.revenueByWeek.forEach((item) => addMonthFromDate(item.date));
    metrics.jobsByWeek.forEach((item) => addMonthFromDate(item.date));

    if (months.length === 0) {
      months.push(new Date().getMonth());
    }

    return months;
  }, [metrics.revenueByWeek, metrics.jobsByWeek]);

  useEffect(() => {
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  useEffect(() => {
    async function fetchDashboardMetrics() {
      try {
        setLoading(true);

        // Build query parameters
        const queryParams = new URLSearchParams({
          time_frame: timeFrame,
        });

        if (selectedMonth !== null && selectedMonth !== undefined) {
          queryParams.append('selected_month', (selectedMonth + 1).toString());
        }

        if (selectedYear !== null && selectedYear !== undefined) {
          queryParams.append('selected_year', selectedYear.toString());
        }

        const response = await fetch(`/api/dashboard-metrics?${queryParams.toString()}`, {
          method: 'GET',
          headers: getApiHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Map the API response to our dashboard metrics structure
        setMetrics({
          totalJobs: data.total_jobs || 0,
          activeBids: data.active_bids || 0,
          totalBidValue: data.total_bid_value || 0,
          totalSoldValue: data.total_sold_value || 0,
          conversionRate: data.conversion_rate || 0,
          averageBidAmount: data.average_bid_amount || 0,
          inProgressValue: data.in_progress_value || 0,
          inProgressJobsCount: data.in_progress_jobs_count || 0,
          statusCounts: data.status_counts || {},
          revenueByWeek: data.revenue_by_week || [],
          jobsByWeek: data.jobs_by_week || [],
          bidToSoldData: [
            { category: 'Total Bids', value: data.total_jobs || 0 },
            { category: 'Sold Projects', value: (data.status_counts?.JOB_COMPLETE || 0) + (data.status_counts?.RLPP_SIGNED || 0) },
            { category: 'Sent Or Declined Bids', value: data.active_bids || 0 },
          ],
          statusTrend: data.status_trend || [],
          referralSources: data.referral_sources || [],
          acceptedReferralSources: data.accepted_referral_sources || [],
          totalEstimatedHours: data.total_estimated_hours || 0,
          totalActualHours: data.total_actual_hours || 0,
          crewLeadHours: (data.crew_lead_hours || []).map((lead: any) => ({
            crewLead: lead.crew_lead,
            estimatedHours: Number(lead.estimated_hours) || 0,
            actualHours: Number(lead.actual_hours) || 0,
          })),
          jobsWithHourDifferences: (data.jobs_with_hour_differences || []).map((job: any) => ({
            id: job.id,
            name: job.name,
            estimatedHours: Number(job.estimated_hours) || 0,
            actualHours: Number(job.actual_hours) || 0,
            difference: Number(job.difference) || 0,
            differencePercentage: Number(job.difference_percentage) || 0,
            updatedAt: job.updated_at,
            crewLead: job.crew_lead,
          })),
          recentlySoldJobs: (data.recently_sold_jobs || []).map((job: any) => ({
            id: job.id,
            name: job.name,
            estimatedHours: Number(job.hours) || 0,
            soldDate: job.sold_date,
          })),
          currentMonthJobs: data.current_month_jobs || 0,
          currentMonthHours: data.current_month_hours || 0,
          hoursLeftToSell: data.hours_left_to_sell || 0,
          hoursLeftLastUpdated: data.hours_left_last_updated || null,
          upcomingFollowUps: (data.upcoming_follow_ups || []).map((job: any) => ({
            id: job.id,
            name: job.name,
            follow_up_date: job.follow_up_date,
            client_address: job.client_address,
            city: job.city,
            state: job.state,
            zip_code: job.zip_code,
          })),
        });
        } catch (error) {
        logToCloudWatch(`Error fetching dashboard metrics: ${error}`);
      } finally {
        setLoading(false);
      }
    }

    if (!isAuthLoading) {
      fetchDashboardMetrics();
    }
  }, [timeFrame, selectedMonth, selectedYear, isAuthLoading]);

  // Helper function to format labels
  const formatLabel = (label: string): string => label
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

  if (isAuthLoading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  return (
    <Container size="xl" pt="md">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1} c="gray.0">Dashboard</Title>
          <Select
            label="Time Period"
            c="gray.0"
            value={timeFrame}
            onChange={(value) => setTimeFrame(value || '30')}
            data={[
              { value: 'ytd', label: 'Year to Date' },
              { value: '7', label: 'Last 7 Days' },
              { value: '30', label: 'Last 30 Days' },
              { value: '90', label: 'Last 90 Days' },
              { value: '365', label: 'Last Year' },
              { value: 'all', label: 'All Time' },
            ]}
            w={200}
          />
        </Group>

        <div style={{ position: 'relative' }}>

          <Grid gutter="md">
            {/* Top row metrics */}
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Total Proposals"
                value={metrics.totalJobs.toString()}
                description="Number of proposals populating the dashboard"
                loading={loading}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Total Proposal Value"
                value={`$${metrics.totalBidValue.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Total value of all finished proposals"
                loading={loading}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Total Sold Value"
                value={`$${metrics.totalSoldValue.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Total value of sold projects"
                loading={loading}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Conversion Rate"
                value={`${metrics.conversionRate.toFixed(1)}%`}
                description="Percentage of bids that converted to sales"
                loading={loading}
              />
            </Grid.Col>

            {/* Second row metrics */}
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Sent Or Declined Proposals"
                value={metrics.activeBids.toString()}
                description="Number of declined or no response proposals"
                loading={loading}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Average Project Amount"
                value={`$${metrics.averageBidAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Average value per sold job"
                loading={loading}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Pipeline Value"
                value={`$${(metrics.inProgressValue).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Value of projects in pipeline"
                loading={loading}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Dollars Bid to Dollars Sold"
                value={`${metrics.totalBidValue > 0 ? ((metrics.totalSoldValue / metrics.totalBidValue) * 100).toFixed(1) : '0.0'}%`}
                description="Percentage of dollars bid to dollars sold"
                loading={loading}
              />
            </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between" my="sm">
                    <div>
                      <Text size="sm" c="dimmed">Total Estimated Hours</Text>
                      {loading ? (
                        <Skeleton height={28} mt={4} />
                      ) : (
                        <Text size="xl" fw={700}>{metrics.totalEstimatedHours.toFixed(1)}</Text>
                      )}
                    </div>
                    <div>
                      <Text size="sm" c="dimmed">Total Actual Hours</Text>
                      {loading ? (
                        <Skeleton height={28} mt={4} />
                      ) : (
                        <Text size="xl" fw={700}>{metrics.totalActualHours.toFixed(1)}</Text>
                      )}
                    </div>
                    <div>
                      <Text size="sm" c="dimmed">Variance</Text>
                      {loading ? (
                        <Skeleton height={28} mt={4} />
                      ) : (
                        <Text
                          size="xl"
                          fw={700}
                          c={metrics.totalActualHours > metrics.totalEstimatedHours ? 'red' : 'green'}
                        >
                          {(metrics.totalActualHours - metrics.totalEstimatedHours).toFixed(1)}
                        </Text>
                      )}
                    </div>
                  </Group>
                </Paper>
                <Paper withBorder p="md" radius="md" mt="sm">
                  <Group justify="space-between" mb="sm">
                    <Title order={3}>Projects Sold in {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</Title>
                    <Group>
                      <Select
                        value={selectedMonth.toString()}
                        onChange={(value) => setSelectedMonth(parseInt(value || '0', 10))}
                        data={availableMonths.map((monthIndex) => ({
                          value: monthIndex.toString(),
                          label: MONTH_LABELS[monthIndex],
                        }))}
                        w={150}
                      />
                      <Select
                        value={selectedYear.toString()}
                        onChange={(value) => setSelectedYear(parseInt(value || '2024', 10))}
                        data={Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - 2 + i;
                          return { value: year.toString(), label: year.toString() };
                        })}
                        w={100}
                      />
                    </Group>
                  </Group>
                  <Group justify="space-between" mt="sm">
                    <div>
                      <Text size="sm" c="dimmed">Projects in {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
                      {loading ? (
                        <Skeleton height={28} mt={4} />
                      ) : (
                        <Text size="xl" fw={700}>{metrics.currentMonthJobs}</Text>
                      )}
                    </div>
                    <div>
                      <Text size="sm" c="dimmed">Hours in {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
                      {loading ? (
                        <Skeleton height={28} mt={4} />
                      ) : (
                        <Text size="xl" fw={700}>{metrics.currentMonthHours.toFixed(1)}</Text>
                      )}
                    </div>
                  </Group>
                </Paper>
                <Paper withBorder p="md" radius="md" mt="sm">
                  <Group justify="space-between" mb="sm">
                    <Title order={3}>Hours Left to Sell</Title>
                    <IconEdit
                      onClick={() => {
                        setEditingHoursValue(metrics.hoursLeftToSell);
                        setEditHoursModalOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </Group>
                  <Group justify="space-between" mt="sm">
                    <div>
                      <Text size="sm" c="dimmed">Current Hours</Text>
                      {loading ? (
                        <Skeleton height={28} mt={4} />
                      ) : (
                        <Text size="xl" fw={700}>{metrics.hoursLeftToSell.toFixed(1)}</Text>
                      )}
                    </div>
                    <div>
                      <Text size="sm" c="dimmed">Last Updated</Text>
                      {loading ? (
                        <Skeleton height={16} mt={4} width={150} />
                      ) : (
                        <Text size="sm" c="dimmed">
                          {metrics.hoursLeftLastUpdated
                            ? new Date(metrics.hoursLeftLastUpdated).toLocaleString()
                            : 'Never'
                          }
                        </Text>
                      )}
                    </div>
                  </Group>
                </Paper>

                <Paper withBorder p="md" radius="md" mt="md">
                  <Title order={3}>
                    Follow-Ups
                  </Title>
                  {loading ? (
                    <Stack mt="md" gap="xs">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} height={40} />
                      ))}
                    </Stack>
                  ) : metrics.upcomingFollowUps.length > 0 ? (
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Client Name</Table.Th>
                          <Table.Th>Address</Table.Th>
                          <Table.Th>Follow-Up Date</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {metrics.upcomingFollowUps.map((job) => (
                          <Table.Tr key={job.id}>
                            <Table.Td>
                              <Anchor
                                c="blue"
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (e.metaKey || e.ctrlKey) {
                                    window.open(`/jobs/${job.id}`, '_blank');
                                  } else {
                                    router.push(`/jobs/${job.id}`);
                                  }
                                }}
                              >
                                {job.name}
                              </Anchor>
                            </Table.Td>
                            <Table.Td>
                              <div>
                                {job.client_address && <div>{job.client_address}</div>}
                              </div>
                            </Table.Td>
                            <Table.Td>
                              {new Date(job.follow_up_date).toLocaleDateString()}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  ) : (
                    <Text size="sm" c="dimmed" mt="md">
                      No upcoming follow-ups
                    </Text>
                  )}
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md" radius="md">
                  <Title order={3}>Hours by Crew Lead</Title>
                  {loading ? (
                    <Stack mt="md" gap="xs">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} height={40} />
                      ))}
                    </Stack>
                  ) : (
                    <Table mt="md">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Crew Lead</Table.Th>
                          <Table.Th>Estimated</Table.Th>
                          <Table.Th>Actual</Table.Th>
                          <Table.Th>Variance</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {metrics.crewLeadHours.map((lead) => (
                          <Table.Tr key={lead.crewLead}>
                            <Table.Td>{lead.crewLead}</Table.Td>
                            <Table.Td>{lead.estimatedHours.toFixed(1)}</Table.Td>
                            <Table.Td>{lead.actualHours.toFixed(1)}</Table.Td>
                            <Table.Td>
                              <Text
                                c={lead.actualHours > lead.estimatedHours ? 'red' : 'green'}
                              >
                                {(lead.actualHours - lead.estimatedHours).toFixed(1)}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Paper>
                <Paper withBorder p="md" radius="md" mt="md">
                  <Title order={3}>
                    Recently Sold Projects
                  </Title>
                  {loading ? (
                    <Stack mt="md" gap="xs">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} height={40} />
                      ))}
                    </Stack>
                  ) : (
                    <Table mt="md">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Project Name</Table.Th>
                          <Table.Th>Estimated Hours</Table.Th>
                          <Table.Th>Sold Date</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {metrics.recentlySoldJobs.map((job) => (
                          <Table.Tr key={job.id}>
                            <Table.Td>
                              <Anchor
                                style={{ color: '#228be6', textDecoration: 'underline', cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (e.metaKey || e.ctrlKey) {
                                    // Open in new tab
                                    window.open(`/jobs/${job.id}`, '_blank');
                                  } else {
                                    // Normal navigation
                                    router.push(`/jobs/${job.id}`);
                                  }
                                }}
                              >
                                {job.name}
                              </Anchor>
                            </Table.Td>
                            <Table.Td>{job.estimatedHours.toFixed(1)}</Table.Td>
                            <Table.Td>
                              {new Date(job.soldDate).toLocaleDateString()}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Paper>
              </Grid.Col>

              {!loading && metrics.jobsWithHourDifferences.length > 0 && (
                <Grid.Col span={12}>
                  <Paper withBorder p="md" radius="md">
                    <Title order={3}>
                      Projects with Hour Differences (Last 30 Days)
                    </Title>
                    <Text size="sm" c="dimmed" mb="md">
                      All projects from the last 30 days with estimated and actual hours
                    </Text>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Project Name</Table.Th>
                          <Table.Th>Estimated Hours</Table.Th>
                          <Table.Th>Actual Hours</Table.Th>
                          <Table.Th>Difference</Table.Th>
                          <Table.Th>Difference %</Table.Th>
                          <Table.Th>Last Updated</Table.Th>
                          <Table.Th>Crew Lead</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {metrics.jobsWithHourDifferences.map((job) => (
                          <Table.Tr key={job.id}>
                            <Table.Td>{job.name}</Table.Td>
                            <Table.Td>{job.estimatedHours.toFixed(1)}</Table.Td>
                            <Table.Td>{job.actualHours.toFixed(1)}</Table.Td>
                            <Table.Td>
                              <Text c={job.differencePercentage >= 20 ? (job.difference > 0 ? 'red' : 'green') : 'black'}>
                                {job.difference.toFixed(1)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text c={job.differencePercentage >= 20 ? (job.difference > 0 ? 'red' : 'green') : 'black'}>
                                {job.differencePercentage.toFixed(1)}%
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {new Date(job.updatedAt).toLocaleDateString()}
                            </Table.Td>
                            <Table.Td>{job.crewLead}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Paper>
                </Grid.Col>
              )}

            {/* Charts Tabs */}
            <Grid.Col span={12}>
              <Tabs
                defaultValue="weekly"
                styles={(theme) => ({
                  tab: {
                    color: theme.colors.gray[0],
                    '&:hover': {
                      color: theme.white,
                      backgroundColor: theme.colors.dark[5],
                    },
                  },
                })}
              >
                <Tabs.List>
                  <Tabs.Tab value="weekly">Weekly Proposals</Tabs.Tab>
                  <Tabs.Tab value="referrals">Referral Sources</Tabs.Tab>
                  <Tabs.Tab value="revenue">Revenue Trend</Tabs.Tab>
                  <Tabs.Tab value="status">Status Distribution</Tabs.Tab>
                  <Tabs.Tab value="conversion">Bid to Sale Conversion</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="revenue" pt="md">
                  <Paper withBorder p="md" radius="md">
                    <Title order={3}>Revenue Trend Over Time</Title>
                    {loading ? (
                      <Skeleton height={300} mt="md" />
                    ) : (
                      <LineChart
                        data={metrics.revenueByWeek.map(item => ({
                          date: item.date || '',
                          value: item.value || 0,
                        }))}
                      />
                    )}
                  </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="weekly" pt="md">
                  <Paper withBorder p="md" radius="md">
                    <Title order={3}>Proposals Created by Week</Title>
                    {loading ? (
                      <Skeleton height={300} mt="md" />
                    ) : (
                      <LineChart
                        data={metrics.jobsByWeek.map(item => ({
                          date: item.date || '',
                          value: item.value || 0,
                        }))}
                      />
                    )}
                  </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="status" pt="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Projects by Status</Title>
                        {loading ? (
                          <Skeleton height={300} mt="md" />
                        ) : (
                          <PieChart data={Object.entries(metrics.statusCounts).map(
                            ([status, count]) => ({
                              status: status || 'Unknown',
                              count: count || 0,
                            })
                          )} />
                        )}
                      </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Status Trends Over Time</Title>
                        {loading ? (
                          <Skeleton height={300} mt="md" />
                        ) : (
                          <LineChart
                            data={metrics.statusTrend}
                            multiLine
                          />
                        )}
                      </Paper>
                    </Grid.Col>
                  </Grid>
                </Tabs.Panel>

                <Tabs.Panel value="conversion" pt="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Bid to Sale Comparison</Title>
                        {loading ? (
                          <Skeleton height={300} mt="md" />
                        ) : (
                          <BarChart data={metrics.bidToSoldData.map(item => ({
                            category: item.category || 'Unknown',
                            value: item.value || 0,
                          }))} />
                        )}
                      </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Value Comparison</Title>
                        {loading ? (
                          <Skeleton height={300} mt="md" />
                        ) : (
                          <BarChart
                            data={[
                              { category: 'Bid Value', value: metrics.totalBidValue || 0 },
                              { category: 'Sold Value', value: metrics.totalSoldValue || 0 },
                            ]}
                          />
                        )}
                      </Paper>
                    </Grid.Col>
                  </Grid>
                </Tabs.Panel>

                <Tabs.Panel value="referrals" pt="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>All Projects by Referral Source</Title>
                        {loading ? (
                          <Skeleton height={300} mt="md" />
                        ) : (
                          <BarChart
                            data={metrics.referralSources.map(item => ({
                              category: formatLabel(item.category || 'Unknown'),
                              value: item.value || 0,
                            }))}
                          />
                        )}
                      </Paper>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Accepted Projects by Referral Source</Title>
                        {loading ? (
                          <Skeleton height={300} mt="md" />
                        ) : (
                          <BarChart
                            data={metrics.acceptedReferralSources.map(item => ({
                              category: formatLabel(item.category || 'Unknown'),
                              value: item.value || 0,
                            }))}
                          />
                        )}
                      </Paper>
                    </Grid.Col>
                  </Grid>
                </Tabs.Panel>
              </Tabs>
            </Grid.Col>
          </Grid>
        </div>
      </Stack>

        {/* Edit Hours Left to Sell Modal */}
        <Modal
          opened={editHoursModalOpen}
          onClose={() => setEditHoursModalOpen(false)}
          title="Edit Hours Left to Sell"
          size="sm"
        >
          <Stack gap="md">
            <NumberInput
              label="Hours Left to Sell"
              placeholder="Enter hours"
              value={editingHoursValue}
              onChange={(value) => {
                const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
                setEditingHoursValue(numValue);
              }}
              min={0}
              step={0.5}
              decimalScale={1}
            />
            <Group justify="flex-end" gap="sm">
              <Button
                variant="outline"
                onClick={() => setEditHoursModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/settings/hours-left-to-sell', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ hoursLeft: editingHoursValue }),
                    });

                    if (response.ok) {
                      const data = await response.json();
                      setMetrics(prev => ({
                        ...prev,
                        hoursLeftToSell: data.hoursLeft,
                        hoursLeftLastUpdated: data.lastUpdated,
                      }));
                      setEditHoursModalOpen(false);
                    }
                  } catch (error) {
                    logToCloudWatch(`Error updating hours left to sell: ${error}`);
                  }
                }}
              >
                Save
              </Button>
            </Group>
          </Stack>
        </Modal>
    </Container>
    );
  }
