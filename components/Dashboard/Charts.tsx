'use client';

import { useState, useEffect } from 'react';

import { Text, Box, Center, Loader } from '@mantine/core';
import dynamic from 'next/dynamic';
import type {
  PieProps,
  BarProps,
  LineProps,
  XAxisProps,
  YAxisProps,
  TooltipProps,
  LegendProps,
  CartesianGridProps,
  CellProps,
  ResponsiveContainerProps,
} from 'recharts';

// Dynamically import recharts components to avoid SSR issues
const DynamicPieChart = dynamic(() => import('./DynamicCharts/PieChart'), { ssr: false }) as any;
const DynamicPie = dynamic(() => import('./DynamicCharts/Pie'), { ssr: false }) as React.ComponentType<PieProps>;
const DynamicBarChart = dynamic(() => import('./DynamicCharts/BarChart'), { ssr: false }) as any;
const DynamicBar = dynamic(() => import('./DynamicCharts/Bar'), { ssr: false }) as React.ComponentType<BarProps>;
const DynamicLineChart = dynamic(() => import('./DynamicCharts/LineChart'), { ssr: false }) as any;
const DynamicLine = dynamic(() => import('./DynamicCharts/Line'), { ssr: false }) as React.ComponentType<LineProps>;
const DynamicXAxis = dynamic(() => import('./DynamicCharts/XAxis'), { ssr: false }) as React.ComponentType<XAxisProps>;
const DynamicYAxis = dynamic(() => import('./DynamicCharts/YAxis'), { ssr: false }) as React.ComponentType<YAxisProps>;
const DynamicTooltip = dynamic(() => import('./DynamicCharts/Tooltip'), { ssr: false }) as React.ComponentType<TooltipProps<any, any>>;
const DynamicLegend = dynamic(() => import('./DynamicCharts/Legend'), { ssr: false }) as React.ComponentType<LegendProps>;
const DynamicCartesianGrid = dynamic(() => import('./DynamicCharts/CartesianGrid'), { ssr: false }) as React.ComponentType<CartesianGridProps>;
const DynamicCell = dynamic(() => import('./DynamicCharts/Cell'), { ssr: false }) as React.ComponentType<CellProps>;
const DynamicResponsiveContainer = dynamic(() => import('./DynamicCharts/ResponsiveContainer'), { ssr: false }) as React.ComponentType<ResponsiveContainerProps>;

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#FF6347'];

// Pie Chart Component
interface PieChartProps {
  data: { status: string; count: number }[];
}

export function PieChart({ data }: PieChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Center h={300}>
        <Text c="dimmed">No data available</Text>
      </Center>
    );
  }

  return (
    <Box h={300}>
      <DynamicResponsiveContainer width="100%" height={300}>
        <DynamicPieChart>
          <DynamicPie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
            nameKey="status"
            label={({ status, percent }: { status: string; percent: number }) =>
              status && percent ? `${status}: ${(percent * 100).toFixed(0)}%` : ''
            }
          >
            {data.map((entry, index) => (
              <DynamicCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </DynamicPie>
          <DynamicTooltip />
          <DynamicLegend />
        </DynamicPieChart>
      </DynamicResponsiveContainer>
    </Box>
  );
}

// Bar Chart Component
interface BarChartProps {
  data: { category: string; value: number }[];
}

export function BarChart({ data }: BarChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Center h={300}>
        <Text c="dimmed">No data available</Text>
      </Center>
    );
  }

  return (
    <Box h={300}>
      <DynamicResponsiveContainer width="100%" height={300}>
        <DynamicBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <DynamicCartesianGrid strokeDasharray="3 3" />
          <DynamicXAxis dataKey="category" />
          <DynamicYAxis />
          <DynamicTooltip />
          <DynamicBar dataKey="value" fill="#8884d8">
            {data.map((entry, index) => (
              <DynamicCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </DynamicBar>
        </DynamicBarChart>
      </DynamicResponsiveContainer>
    </Box>
  );
}

// Line Chart Component
interface TimeDataPoint {
  date: string;
  value: number;
  [key: string]: string | number; // Allow any string key with number value for multiple lines
}

interface LineChartProps {
  data: TimeDataPoint[];
  multiLine?: boolean;
}

export function LineChart({ data, multiLine = false }: LineChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  // If no data, display placeholder data for demonstration
  const demoData = !data || data.length === 0 ? [
    { date: 'Jan', value: 4000 },
    { date: 'Feb', value: 3000 },
    { date: 'Mar', value: 5000 },
    { date: 'Apr', value: 2780 },
    { date: 'May', value: 1890 },
    { date: 'Jun', value: 2390 },
  ] : data;

  // For multi-line charts, we need to render a line for each key except 'date'
  const renderLines = () => {
    if (!multiLine || !data || data.length === 0) {
      return (
        <DynamicLine
          type="monotone"
          dataKey="value"
          stroke="#8884d8"
          activeDot={{ r: 8 }}
        />
      );
    }

    // Get all keys except 'date'
    const keys = Object.keys(data[0]).filter(key => key !== 'date');

    return keys.map((key, index) => (
      <DynamicLine
        key={key}
        type="monotone"
        dataKey={key}
        stroke={COLORS[index % COLORS.length]}
        activeDot={{ r: 8 }}
      />
    ));
  };

  return (
    <Box h={300}>
      <DynamicResponsiveContainer width="100%" height={300}>
        <DynamicLineChart data={demoData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <DynamicCartesianGrid strokeDasharray="3 3" />
          <DynamicXAxis dataKey="date" />
          <DynamicYAxis />
          <DynamicTooltip />
          <DynamicLegend />
          {renderLines()}
        </DynamicLineChart>
      </DynamicResponsiveContainer>
    </Box>
  );
}
