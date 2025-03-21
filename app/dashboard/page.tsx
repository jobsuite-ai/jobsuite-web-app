'use client';

import { useEffect, useState } from 'react';

import { Title, Container, Grid, Paper, Stack, LoadingOverlay, Tabs, Group, Select } from '@mantine/core';

import { BarChart, PieChart, LineChart } from '@/components/Dashboard/Charts';
import { MetricCard } from '@/components/Dashboard/MetricCard';
import { Job, JobStatus } from '@/components/Global/model';
import { logToCloudWatch } from '@/public/logger';

// Status groups for analysis
const ESTIMATE_STAGES = [
  JobStatus.ESTIMATE_NOT_SCHEDULED,
  JobStatus.ESTIMATE_SCHEDULED,
  JobStatus.ESTIMATE_IN_PROGRESS,
  JobStatus.ESTIMATE_SENT,
  JobStatus.ESTIMATE_OPENED,
];

const SOLD_STAGES = [
  JobStatus.ESTIMATE_ACCEPTED,
  JobStatus.RLPP_SIGNED,
  JobStatus.JOB_COMPLETE,
];

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

interface DashboardMetrics {
  totalJobs: number;
  activeBids: number;
  totalBidValue: number;
  totalSoldValue: number;
  conversionRate: number;
  averageBidAmount: number;
  statusCounts: Record<string, number>;
  revenueByWeek: TimeDataPoint[];
  jobsByWeek: TimeDataPoint[];
  bidToSoldData: CategoryValue[];
  statusTrend: StatusTrendPoint[];
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState('30'); // Default to last 30 days
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalJobs: 0,
    activeBids: 0,
    totalBidValue: 0,
    totalSoldValue: 0,
    conversionRate: 0,
    averageBidAmount: 0,
    statusCounts: {},
    revenueByWeek: [],
    jobsByWeek: [],
    bidToSoldData: [],
    statusTrend: [],
  });

  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true);
        const response = await fetch('/api/jobs', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const { Items } = await response.json();

        // Get detailed job data with line items
        const detailedJobs = await Promise.all(
          Items.map(async (job: Job) => {
            try {
              const detailResponse = await fetch(`/api/jobs/${job.id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
              });

              return await detailResponse.json();
            } catch (error) {
              logToCloudWatch(`Error fetching detail for job ${job.id}: ${error}`);
              return job;
            }
          })
        );

        // Calculate metrics
        calculateMetrics(detailedJobs);
      } catch (error) {
        logToCloudWatch(`Error fetching jobs: ${error}`);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [timeFrame]);

  const calculateMetrics = (jobs: any[]) => {
    // Filter for jobs within selected time frame
    const daysToFilter = parseInt(timeFrame, 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToFilter);

    const filteredJobs = timeFrame === 'all'
      ? jobs
      : jobs.filter(job => {
          // Handle both direct job objects and DynamoDB Items
          const jobData = job.Item || job;
          const createdAtStr = jobData.createdAt?.S || jobData.createdAt;
          const estimateDateStr = jobData.estimate_date?.S || jobData.estimate_date;
          const jobDate = createdAtStr ? new Date(createdAtStr)
                       : estimateDateStr ? new Date(estimateDateStr)
                       : new Date();
          return jobDate >= cutoffDate;
        });

    const statusCounts: Record<string, number> = {};
    let totalBidValue = 0;
    let totalSoldValue = 0;
    let soldJobsCount = 0;
    let activeBidsCount = 0;

    // Count jobs by status and calculate values
    filteredJobs.forEach(jobObject => {
      // Handle both direct job objects and DynamoDB Items
      const job = jobObject.Item || jobObject;
      const status = job.job_status?.S || job.job_status;

      // Count by status
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Calculate job value from line items
      const lineItems = job.line_items?.L || [];
      const jobValue = lineItems.reduce((total: number, item: any) => {
        const price = parseFloat(item.M?.price?.N || '0');
        return total + price;
      }, 0);

      // Alternative calculation if no line items but has hours and rate
      const hours = parseFloat(job.estimate_hours?.N || '0');
      const rate = parseFloat(job.hourly_rate?.N || '0');
      const alternativeValue = hours * rate;

      const finalJobValue = jobValue > 0 ? jobValue : alternativeValue;

      // Track statuses for different metrics
      if (SOLD_STAGES.includes(status)) {
        soldJobsCount += 1;
        totalSoldValue += finalJobValue;
      }

      if (ESTIMATE_STAGES.includes(status)) {
        activeBidsCount += 1;
      }

      // All jobs contribute to total bid value
      if (status !== JobStatus.ARCHIVED) {
        totalBidValue += finalJobValue;
      }
    });

    // Generate weekly revenue data
    const weeklyRevenueData = generateWeeklyRevenueData(filteredJobs);

    // Generate weekly jobs data
    const weeklyData = generateWeeklyData(filteredJobs);

    // Generate status trend data
    const statusTrendData = generateStatusTrendData(filteredJobs);

    const newMetrics = {
      totalJobs: filteredJobs.length,
      activeBids: activeBidsCount,
      totalBidValue,
      totalSoldValue,
      conversionRate: filteredJobs.length > 0 ? (soldJobsCount / filteredJobs.length) * 100 : 0,
      averageBidAmount: filteredJobs.length > 0 ? totalBidValue / filteredJobs.length : 0,
      statusCounts,
      revenueByWeek: weeklyRevenueData,
      jobsByWeek: weeklyData,
      bidToSoldData: [
        { category: 'Total Bids', value: filteredJobs.length },
        { category: 'Sold Jobs', value: soldJobsCount },
        { category: 'Active Bids', value: activeBidsCount },
      ],
      statusTrend: statusTrendData,
    };

    setMetrics(newMetrics);
  };

  // Helper function to generate weekly revenue data
  const generateWeeklyRevenueData = (jobs: any[]): TimeDataPoint[] => {
    const weeks: Record<string, number> = {};
    const timePoints: string[] = [];

    // Helper function to get the start of the week for a given date
    const getWeekStart = (date: Date): Date => {
      const result = new Date(date);
      result.setHours(0, 0, 0, 0);
      result.setDate(result.getDate() - result.getDay()); // Set to Sunday
      return result;
    };

    // Helper function to format date consistently
    const formatWeekKey = (date: Date): string => {
      const month = date.toLocaleString('default', { month: 'short' });
      const day = date.getDate();
      return `${month} ${day}`;
    };

    // Calculate number of weeks to show based on timeFrame
    let numberOfWeeks = 12; // default
    if (timeFrame === '7') {
      numberOfWeeks = 1;
    } else if (timeFrame === '30') {
      numberOfWeeks = 4;
    } else if (timeFrame === '90') {
      numberOfWeeks = 13;
    } else if (timeFrame === '365') {
      numberOfWeeks = 52;
    } else if (timeFrame === 'all') {
      // For all time, find the earliest job date and calculate weeks from there
      const earliestDate = jobs.reduce((earliest, jobObject) => {
        const job = jobObject.Item || jobObject;
        const jobDate = new Date(job.estimate_date?.S || job.createdAt?.S || job.createdAt);
        return jobDate < earliest ? jobDate : earliest;
      }, new Date());

      const weekDiff = Math.ceil(
        (new Date().getTime() - earliestDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      numberOfWeeks = Math.max(12, weekDiff); // At least 12 weeks
    }

    // Create entries for the weeks
    for (let i = 0; i < numberOfWeeks; i += 1) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      const weekStart = getWeekStart(date);
      const weekKey = formatWeekKey(weekStart);
      weeks[weekKey] = 0;
      timePoints.unshift(weekKey);
    }

    // Populate with actual data
    jobs.forEach(jobObject => {
      const job = jobObject.Item || jobObject;
      const status = job.job_status?.S || job.job_status;
      if (SOLD_STAGES.includes(status)) {
        const createdAtStr = job.createdAt?.S || job.createdAt;
        const estimateDateStr = job.estimate_date?.S || job.estimate_date;
        const jobDate = createdAtStr ? new Date(createdAtStr)
                     : estimateDateStr ? new Date(estimateDateStr)
                     : new Date();
        const weekStart = getWeekStart(jobDate);
        const weekKey = formatWeekKey(weekStart);

        // Calculate job value from line items
        const lineItems = job.line_items?.L || job.line_items || [];
        let jobValue = lineItems.reduce((total: number, item: any) => {
          const price = parseFloat(item.M?.price?.N || item.price || '0');
          return total + price;
        }, 0);

        if (jobValue === 0) {
          // Alternative calculation if no line items but has hours and rate
          const hours = parseFloat(job.estimate_hours?.N || job.estimate_hours || '0');
          const rate = parseFloat(job.hourly_rate?.N || job.hourly_rate || '0');
          jobValue = hours * rate;
        }

        if (weeks[weekKey] !== undefined) {
          weeks[weekKey] += jobValue;
        }
      }
    });

    // Convert to array format needed for chart
    return timePoints.map(week => ({
      date: week,
      value: weeks[week],
    }));
  };

  // Helper function to generate weekly job data
  const generateWeeklyData = (jobs: any[]): TimeDataPoint[] => {
    const weeks: Record<string, number> = {};
    const timePoints: string[] = [];

    // Helper function to get the start of the week for a given date
    const getWeekStart = (date: Date): Date => {
      const result = new Date(date);
      result.setHours(0, 0, 0, 0);
      result.setDate(result.getDate() - result.getDay()); // Set to Sunday
      return result;
    };

    // Helper function to format date consistently
    const formatWeekKey = (date: Date): string => {
      const month = date.toLocaleString('default', { month: 'short' });
      const day = date.getDate();
      return `${month} ${day}`;
    };

    // Calculate number of weeks to show based on timeFrame
    let numberOfWeeks = 12; // default
    if (timeFrame === '7') {
      numberOfWeeks = 1;
    } else if (timeFrame === '30') {
      numberOfWeeks = 4;
    } else if (timeFrame === '90') {
      numberOfWeeks = 13;
    } else if (timeFrame === '365') {
      numberOfWeeks = 52;
    } else if (timeFrame === 'all') {
      // For all time, find the earliest job date and calculate weeks from there
      const earliestDate = jobs.reduce((earliest, jobObject) => {
        const job = jobObject.Item || jobObject;
        const jobDate = new Date(job.estimate_date?.S || job.createdAt?.S || job.createdAt);
        return jobDate < earliest ? jobDate : earliest;
      }, new Date());

      const weekDiff = Math.ceil(
        (new Date().getTime() - earliestDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      numberOfWeeks = Math.max(12, weekDiff); // At least 12 weeks
    }

    // Create entries for the weeks
    for (let i = 0; i < numberOfWeeks; i += 1) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      const weekStart = getWeekStart(date);
      const weekKey = formatWeekKey(weekStart);
      weeks[weekKey] = 0;
      timePoints.unshift(weekKey);
    }

    // Populate with actual data
    jobs.forEach(jobObject => {
      const job = jobObject.Item || jobObject;
      const createdAtStr = job.createdAt?.S || job.createdAt;
      const estimateDateStr = job.estimate_date?.S || job.estimate_date;
      const jobDate = createdAtStr ? new Date(createdAtStr)
                   : estimateDateStr ? new Date(estimateDateStr)
                   : new Date();
      const weekStart = getWeekStart(jobDate);
      const weekKey = formatWeekKey(weekStart);

      if (weeks[weekKey] !== undefined) {
        weeks[weekKey] += 1;
      }
    });

    // Convert to array format needed for chart
    return timePoints.map(week => ({
      date: week,
      value: weeks[week],
    }));
  };

  // Helper function to generate status trend data
  const generateStatusTrendData = (jobs: any[]): StatusTrendPoint[] => {
    const monthlyStatusCounts: Record<string, Record<string, number>> = {};
    const lastSixMonths: string[] = [];

    // Initialize last 6 months
    for (let i = 0; i < 6; i += 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      lastSixMonths.unshift(monthKey);
      monthlyStatusCounts[monthKey] = {
        New: 0,
        InProgress: 0,
        Completed: 0,
      };
    }

    // Count jobs by status per month
    jobs.forEach(jobObject => {
      const job = jobObject.Item || jobObject;
      const status = job.job_status?.S || job.job_status;
      const jobDate = new Date(job.estimate_date?.S || job.createdAt?.S || job.createdAt);
      const monthKey = jobDate.toLocaleString('default', { month: 'short' });

      if (monthlyStatusCounts[monthKey]) {
        if (ESTIMATE_STAGES.slice(0, 2).includes(status)) {
          monthlyStatusCounts[monthKey].New += 1;
        } else if (ESTIMATE_STAGES.slice(2).includes(status)) {
          monthlyStatusCounts[monthKey].InProgress += 1;
        } else if (SOLD_STAGES.includes(status)) {
          monthlyStatusCounts[monthKey].Completed += 1;
        }
      }
    });

    // Convert to array format needed for chart
    return lastSixMonths.map(month => ({
      date: month,
      New: monthlyStatusCounts[month].New,
      InProgress: monthlyStatusCounts[month].InProgress,
      Completed: monthlyStatusCounts[month].Completed,
    }));
  };

  return (
    <Container size="xl" pt="md">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>Dashboard</Title>
          <Select
            label="Time Period"
            value={timeFrame}
            onChange={(value) => setTimeFrame(value || '30')}
            data={[
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
          <LoadingOverlay visible={loading} />

          <Grid gutter="md">
            {/* Top row metrics */}
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Total Jobs"
                value={metrics.totalJobs.toString()}
                description="Total number of jobs in system"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Total Bid Value"
                value={`$${metrics.totalBidValue.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Total value of all bids"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Total Sold Value"
                value={`$${metrics.totalSoldValue.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Total value of sold jobs"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Conversion Rate"
                value={`${metrics.conversionRate.toFixed(1)}%`}
                description="Percentage of bids that converted to sales"
              />
            </Grid.Col>

            {/* Second row metrics */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <MetricCard
                title="Active Bids"
                value={metrics.activeBids.toString()}
                description="Number of bids in progress"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <MetricCard
                title="Average Bid Amount"
                value={`$${metrics.averageBidAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Average value per bid"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <MetricCard
                title="Pipeline Value"
                value={`$${(metrics.totalBidValue - metrics.totalSoldValue).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Value of jobs in pipeline"
              />
            </Grid.Col>

            {/* Charts Tabs */}
            <Grid.Col span={12}>
              <Tabs defaultValue="revenue">
                <Tabs.List>
                  <Tabs.Tab value="revenue">Revenue Trend</Tabs.Tab>
                  <Tabs.Tab value="weekly">Weekly Jobs</Tabs.Tab>
                  <Tabs.Tab value="status">Status Distribution</Tabs.Tab>
                  <Tabs.Tab value="conversion">Bid to Sale Conversion</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="revenue" pt="md">
                  <Paper withBorder p="md" radius="md">
                    <Title order={3}>Revenue Trend Over Time</Title>
                    <LineChart
                      data={metrics.revenueByWeek.map(item => ({
                        date: item.date || '',
                        value: item.value || 0,
                      }))}
                    />
                  </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="weekly" pt="md">
                  <Paper withBorder p="md" radius="md">
                    <Title order={3}>Jobs Created by Week</Title>
                    <LineChart
                      data={metrics.jobsByWeek.map(item => ({
                        date: item.date || '',
                        value: item.value || 0,
                      }))}
                    />
                  </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="status" pt="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Jobs by Status</Title>
                        <PieChart data={Object.entries(metrics.statusCounts).map(
                          ([status, count]) => ({
                            status: status || 'Unknown',
                            count: count || 0,
                          })
                        )} />
                      </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Status Trends Over Time</Title>
                        <LineChart
                          data={metrics.statusTrend}
                          multiLine
                        />
                      </Paper>
                    </Grid.Col>
                  </Grid>
                </Tabs.Panel>

                <Tabs.Panel value="conversion" pt="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Bid to Sale Comparison</Title>
                        <BarChart data={metrics.bidToSoldData.map(item => ({
                          category: item.category || 'Unknown',
                          value: item.value || 0,
                        }))} />
                      </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Value Comparison</Title>
                        <BarChart
                          data={[
                            { category: 'Bid Value', value: metrics.totalBidValue || 0 },
                            { category: 'Sold Value', value: metrics.totalSoldValue || 0 },
                          ]}
                        />
                      </Paper>
                    </Grid.Col>
                  </Grid>
                </Tabs.Panel>
              </Tabs>
            </Grid.Col>
          </Grid>
        </div>
      </Stack>
    </Container>
  );
}
