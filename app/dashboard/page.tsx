'use client';

import { useEffect, useState } from 'react';

import { useUser } from '@auth0/nextjs-auth0/client';
import { Title, Container, Grid, Paper, Stack, LoadingOverlay, Tabs, Group, Select, Text, Table } from '@mantine/core';
import { useRouter } from 'next/navigation';

import { BarChart, PieChart, LineChart } from '@/components/Dashboard/Charts';
import { MetricCard } from '@/components/Dashboard/MetricCard';
import { Job, JobStatus } from '@/components/Global/model';
import { logToCloudWatch } from '@/public/logger';

// Status groups for analysis
const ESTIMATE_STAGES = [
  JobStatus.ESTIMATE_SENT,
  JobStatus.ESTIMATE_OPENED,
  JobStatus.ESTIMATE_DECLINED,
  JobStatus.NEEDS_FOLLOW_UP,
  JobStatus.STALE_ESTIMATE,
];

const IN_PROGRESS_STAGES = [
  JobStatus.ESTIMATE_IN_PROGRESS,
  JobStatus.NEW_LEAD,
  JobStatus.ESTIMATE_NOT_SCHEDULED,
  JobStatus.ESTIMATE_SCHEDULED,
  JobStatus.ESTIMATE_SENT,
  JobStatus.ESTIMATE_OPENED,
  JobStatus.NEEDS_FOLLOW_UP,
  JobStatus.STALE_ESTIMATE,
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
  totalEstimatedHours: number;
  totalActualHours: number;
  crewLeadHours: CrewLeadHours[];
  jobsWithHourDifferences: JobWithHourDifference[];
}

export default function Dashboard() {
  const { user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState('ytd'); // Default to year to date
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
    totalEstimatedHours: 0,
    totalActualHours: 0,
    crewLeadHours: [],
    jobsWithHourDifferences: [],
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      // Redirect to login page if the user is not logged in
      router.push('/profile');
    }

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
  }, [timeFrame, isUserLoading, user, router]);

  const calculateMetrics = (jobs: any[]) => {
    // Filter for jobs within selected time frame
    const daysToFilter = parseInt(timeFrame, 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToFilter);

    const filteredJobs = timeFrame === 'all'
      ? jobs
      : timeFrame === 'ytd'
      ? jobs.filter(job => {
          const jobData = job.Item || job;
          const createdAtStr = jobData.createdAt?.S || jobData.createdAt;
          const estimateDateStr = jobData.estimate_date?.S || jobData.estimate_date;
          const jobDate = createdAtStr ? new Date(createdAtStr)
                       : estimateDateStr ? new Date(estimateDateStr)
                       : new Date();
          const yearStart = new Date(new Date().getFullYear(), 0, 1); // January 1st of current year
          return jobDate >= yearStart;
        })
      : jobs.filter(job => {
          const jobData = job.Item || job;
          const createdAtStr = jobData.createdAt?.S || jobData.createdAt;
          const estimateDateStr = jobData.estimate_date?.S || jobData.estimate_date;
          const jobDate = createdAtStr ? new Date(createdAtStr)
                       : estimateDateStr ? new Date(estimateDateStr)
                       : new Date();
          return jobDate >= cutoffDate;
        });

    const statusCounts: Record<string, number> = {};
    const referralSourceCounts: Record<string, number> = {};
    let totalBidValue = 0;
    let totalSoldValue = 0;
    let soldJobsCount = 0;
    let activeBidsCount = 0;
    let totalEstimateCount = 0;
    let inProgressJobsCount = 0;
    let inProgressValue = 0;
    let totalEstimatedHours = 0;
    let totalActualHours = 0;
    const crewLeadHoursMap: Record<string, { estimatedHours: number; actualHours: number }> = {};
    const jobsWithHourDifferences: JobWithHourDifference[] = [];

    // Count jobs by status and calculate values
    filteredJobs.forEach(jobObject => {
      // Handle both direct job objects and DynamoDB Items
      const job = jobObject.Item || jobObject;
      const status = job.job_status?.S || job.job_status;
      const referralSource = job.referral_source?.S || job.referral_source;
      const crewLead = job.job_crew_lead?.S || job.job_crew_lead;
      const isExcluded = job.is_excluded?.BOOL || job.is_excluded;

      // First try to get hours and rate
      const hours = parseFloat(job.estimate_hours?.N || '0');
      const actualHours = parseFloat(job.actual_hours?.N || '0');
      const rate = parseFloat(job.hourly_rate?.N || '0');
      const hoursAndRate = hours * rate;

      // Check for significant hour differences in jobs updated in the last month
      const updatedAt = job.updated_at?.S || job.updated_at;
      if (updatedAt) {
        const updatedDate = new Date(updatedAt);
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        if (updatedDate >= oneMonthAgo && hours > 0 && actualHours > 0) {
          const difference = actualHours - hours;
          const differencePercentage = Math.abs(difference / hours) * 100;

          if (differencePercentage >= 20) {
            jobsWithHourDifferences.push({
              id: job.id?.S || job.id,
              name: job.client_name?.S || job.name || 'Unnamed Job',
              estimatedHours: hours,
              actualHours,
              difference,
              differencePercentage,
              updatedAt,
              crewLead,
            });
          }
        }
      }

      // Track hours for completed jobs
      if (status === JobStatus.JOB_COMPLETE) {
        totalEstimatedHours += hours;
        totalActualHours += actualHours;

        if (crewLead) {
          if (!crewLeadHoursMap[crewLead]) {
            crewLeadHoursMap[crewLead] = { estimatedHours: 0, actualHours: 0 };
          }
          crewLeadHoursMap[crewLead].estimatedHours += hours;
          crewLeadHoursMap[crewLead].actualHours += actualHours;
        }
      }

      // Skip archived jobs and excluded jobs
      if (status === JobStatus.ARCHIVED || isExcluded) {
        return;
      }

      // Count by status
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Count by referral source if defined
      if (referralSource) {
        referralSourceCounts[referralSource] = (referralSourceCounts[referralSource] || 0) + 1;
      }

      let finalJobValue = hoursAndRate;
      if (finalJobValue === 0) {
        // Calculate job value from line items if hours and rate are not available
        const lineItems = job.line_items?.L || [];
        const jobValue = lineItems.reduce((total: number, item: any) => {
          const price = parseFloat(item.M?.price?.N || '0');
          return total + price;
        }, 0);
        finalJobValue = jobValue;
      }

      // Track statuses for different metrics
      if (SOLD_STAGES.includes(status)) {
        soldJobsCount += 1;
        totalSoldValue += finalJobValue;
        totalEstimateCount += 1;
      }

      if (IN_PROGRESS_STAGES.includes(status)) {
        inProgressJobsCount += 1;
        inProgressValue += finalJobValue;
      }

      if (ESTIMATE_STAGES.includes(status)) {
        activeBidsCount += 1;
        totalBidValue += finalJobValue;
        totalEstimateCount += 1;
      }
    });

    // Sort jobs with hour differences by percentage difference in descending order
    jobsWithHourDifferences.sort((a, b) => b.differencePercentage - a.differencePercentage);

    // Convert crew lead hours map to array
    const crewLeadHours = Object.entries(crewLeadHoursMap).map(([crewLead, hours]) => ({
      crewLead,
      estimatedHours: hours.estimatedHours,
      actualHours: hours.actualHours,
    }));

    // Generate weekly revenue data
    const weeklyRevenueData = generateWeeklyRevenueData(filteredJobs);

    // Generate weekly jobs data
    const weeklyData = generateWeeklyData(filteredJobs);

    // Generate status trend data
    const statusTrendData = generateStatusTrendData(filteredJobs);

    const newMetrics = {
      totalJobs: totalEstimateCount,
      activeBids: activeBidsCount,
      totalBidValue,
      totalSoldValue,
      conversionRate: totalEstimateCount > 0 ? (soldJobsCount / totalEstimateCount) * 100 : 0,
      averageBidAmount: soldJobsCount > 0 ? totalSoldValue / soldJobsCount : 0,
      inProgressValue,
      inProgressJobsCount,
      statusCounts,
      revenueByWeek: weeklyRevenueData,
      jobsByWeek: weeklyData,
      bidToSoldData: [
        { category: 'Total Bids', value: totalEstimateCount },
        { category: 'Sold Jobs', value: soldJobsCount },
        { category: 'Sent Or Declined Bids', value: activeBidsCount },
      ],
      statusTrend: statusTrendData,
      referralSources: Object.entries(referralSourceCounts).map(([source, count]) => ({
        category: source,
        value: count,
      })),
      totalEstimatedHours,
      totalActualHours,
      crewLeadHours,
      jobsWithHourDifferences,
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

  // Helper function to format labels
  const formatLabel = (label: string): string => label
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

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
          <LoadingOverlay visible={loading} />

          <Grid gutter="md">
            {/* Top row metrics */}
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Total Estimates"
                value={metrics.totalJobs.toString()}
                description="Number of estimates populating the dashboard"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Total Estimate Value"
                value={`$${metrics.totalBidValue.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Total value of all finished estimates"
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
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Sent Or Declined Estimates"
                value={metrics.activeBids.toString()}
                description="Number of declined or no response estimates"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Average Job Amount"
                value={`$${metrics.averageBidAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Average value per sold job"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Pipeline Value"
                value={`$${(metrics.inProgressValue).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
                description="Value of jobs in pipeline"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <MetricCard
                title="Dollars Bid to Dollars Sold"
                value={`${((metrics.totalSoldValue / metrics.totalBidValue) * 100).toFixed(1)}%`}
                description="Percentage of dollars bid to dollars sold"
              />
            </Grid.Col>

            {/* Charts Tabs */}
            <Grid.Col span={12}>
              <Tabs defaultValue="hours">
                <Tabs.List>
                  <Tabs.Tab value="hours">Hours</Tabs.Tab>
                  <Tabs.Tab value="referrals">Referral Sources</Tabs.Tab>
                  <Tabs.Tab value="revenue">Revenue Trend</Tabs.Tab>
                  <Tabs.Tab value="weekly">Weekly Estimates</Tabs.Tab>
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
                    <Title order={3}>Estimates Created by Week</Title>
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

                <Tabs.Panel value="referrals" pt="md">
                  <Paper withBorder p="md" radius="md">
                    <Title order={3}>Jobs by Referral Source</Title>
                    <BarChart
                      data={metrics.referralSources.map(item => ({
                        category: formatLabel(item.category || 'Unknown'),
                        value: item.value || 0,
                      }))}
                    />
                  </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="hours" pt="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Total Hours</Title>
                        <Group justify="space-between" mt="md">
                          <div>
                            <Text size="sm" c="dimmed">Estimated Hours</Text>
                            <Text size="xl" fw={700}>{metrics.totalEstimatedHours.toFixed(1)}</Text>
                          </div>
                          <div>
                            <Text size="sm" c="dimmed">Actual Hours</Text>
                            <Text size="xl" fw={700}>{metrics.totalActualHours.toFixed(1)}</Text>
                          </div>
                          <div>
                            <Text size="sm" c="dimmed">Variance</Text>
                            <Text
                              size="xl"
                              fw={700}
                              c={metrics.totalActualHours > metrics.totalEstimatedHours ? 'red' : 'green'}
                            >
                              {(metrics.totalActualHours - metrics.totalEstimatedHours).toFixed(1)}
                            </Text>
                          </div>
                        </Group>
                      </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" radius="md">
                        <Title order={3}>Hours by Crew Lead</Title>
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
                      </Paper>
                    </Grid.Col>

                    {metrics.jobsWithHourDifferences.length > 0 && (
                      <Grid.Col span={12}>
                        <Paper withBorder p="md" radius="md">
                          <Title order={3}>
                            Jobs with Significant Hour Differences (Last 30 Days)
                          </Title>
                          <Text size="sm" c="dimmed" mb="md">
                            Jobs with 20% or greater difference between estimated and actual hours
                          </Text>
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Job Name</Table.Th>
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
                                    <Text c={job.difference > 0 ? 'red' : 'green'}>
                                      {job.difference.toFixed(1)}
                                    </Text>
                                  </Table.Td>
                                  <Table.Td>
                                    <Text c={job.difference > 0 ? 'red' : 'green'}>
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
