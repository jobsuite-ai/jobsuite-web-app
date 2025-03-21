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
  [key: string]: number | string;
}

interface StatusTrendPoint {
  date: string;
  [key: string]: number | string;
}

interface DashboardMetrics {
  totalJobs: number;
  activeBids: number;
  totalBidValue: number;
  totalSoldValue: number;
  conversionRate: number;
  averageBidAmount: number;
  statusCounts: Record<string, number>;
  revenueByMonth: TimeDataPoint[];
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
    revenueByMonth: [],
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
          const createdAtStr = job.createdAt?.S;
          const estimateDateStr = job.estimate_date?.S;
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
      const job = jobObject.Item;
      const status = job.job_status?.S;

      // Count by status
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Calculate job value from line items
      const lineItems = job.line_items?.L || [];
      const jobValue = lineItems.reduce((total: number, item: any) => {
        const price = item.M?.price?.N ? parseFloat(item.M.price.N) : 0;
        return total + price;
      }, 0);

      // Alternative calculation if no line items but has hours and rate
      const hours = job.estimate_hours?.N ? parseFloat(job.estimate_hours.N) : 0;
      const rate = job.hourly_rate?.N ? parseFloat(job.hourly_rate.N) : 0;
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
      totalBidValue += finalJobValue;
    });

    // Generate monthly revenue data (simplified)
    const monthlyData = generateMonthlyData(filteredJobs);

    // Generate status trend data
    const statusTrendData = generateStatusTrendData();

    setMetrics({
      totalJobs: filteredJobs.length,
      activeBids: activeBidsCount,
      totalBidValue,
      totalSoldValue,
      conversionRate: filteredJobs.length > 0 ? (soldJobsCount / filteredJobs.length) * 100 : 0,
      averageBidAmount: filteredJobs.length > 0 ? totalBidValue / filteredJobs.length : 0,
      statusCounts,
      revenueByMonth: monthlyData,
      bidToSoldData: [
        { category: 'Total Bids', value: filteredJobs.length },
        { category: 'Sold Jobs', value: soldJobsCount },
        { category: 'Active Bids', value: activeBidsCount },
      ],
      statusTrend: statusTrendData,
    });
  };

  // Helper function to generate monthly revenue data
  const generateMonthlyData = (jobs: any[]): TimeDataPoint[] => {
    const months: Record<string, number> = {};
    const lastSixMonths: string[] = [];

    // Create entries for the last 6 months
    for (let i = 0; i < 6; i += 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      months[monthKey] = 0;
      lastSixMonths.unshift(monthKey);
    }

    // Populate with actual data
    jobs.forEach(jobObject => {
      const job = jobObject.Item;
      if (SOLD_STAGES.includes(job.job_status?.S || job.job_status)) {
        const jobDate = job.estimate_date?.S ? new Date(job.estimate_date.S) : new Date();
        const monthKey = jobDate.toLocaleString('default', { month: 'short', year: '2-digit' });

        // Calculate job value
        const lineItems = job.line_items?.L || [];
        const jobValue = lineItems.reduce((total: number, item: any) => {
          const price = item.M?.price?.N ? parseFloat(item.M.price.N) : 0;
          return total + price;
        }, 0);

        if (months[monthKey] !== undefined) {
          months[monthKey] += jobValue;
        }
      }
    });

    // Convert to array format needed for chart
    return lastSixMonths.map(month => ({
      date: month,
      value: months[month],
    }));
  };

  // Helper function to generate status trend data
  const generateStatusTrendData = (): StatusTrendPoint[] =>
    // Simplified implementation - in a real app, this would use actual date data
    // For demo purposes, creating a trend over months
     [
      { date: 'Jan', New: 4, InProgress: 2, Completed: 1 },
      { date: 'Feb', New: 6, InProgress: 3, Completed: 2 },
      { date: 'Mar', New: 5, InProgress: 5, Completed: 3 },
      { date: 'Apr', New: 8, InProgress: 6, Completed: 4 },
      { date: 'May', New: 10, InProgress: 7, Completed: 6 },
      { date: 'Jun', New: 12, InProgress: 9, Completed: 8 },
    ];
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
              <Tabs defaultValue="status">
                <Tabs.List>
                  <Tabs.Tab value="status">Status Distribution</Tabs.Tab>
                  <Tabs.Tab value="conversion">Bid to Sale Conversion</Tabs.Tab>
                  <Tabs.Tab value="revenue">Revenue Trend</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="status" pt="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Jobs by Status</Title>
                        <PieChart data={Object.entries(metrics.statusCounts).map(
                          ([status, count]) => ({ status, count }
                        ))} />
                      </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Status Trends Over Time</Title>
                        {/* This would be a stacked area chart in a full implementation */}
                        <LineChart data={metrics.revenueByMonth} />
                      </Paper>
                    </Grid.Col>
                  </Grid>
                </Tabs.Panel>

                <Tabs.Panel value="conversion" pt="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Bid to Sale Comparison</Title>
                        <BarChart data={metrics.bidToSoldData} />
                      </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Value Comparison</Title>
                        <BarChart
                          data={[
                            { category: 'Bid Value', value: metrics.totalBidValue },
                            { category: 'Sold Value', value: metrics.totalSoldValue },
                          ]}
                        />
                      </Paper>
                    </Grid.Col>
                  </Grid>
                </Tabs.Panel>

                <Tabs.Panel value="revenue" pt="md">
                  <Paper withBorder p="md" radius="md">
                    <Title order={3}>Revenue Trend Over Time</Title>
                    <LineChart data={metrics.revenueByMonth} />
                  </Paper>
                </Tabs.Panel>
              </Tabs>
            </Grid.Col>
          </Grid>
        </div>
      </Stack>
    </Container>
  );
}
