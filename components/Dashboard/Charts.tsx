'use client';

import { useState, useEffect } from 'react';

import { Text, Box, Center, Loader } from '@mantine/core';
import {
  PieChart as RechartsPieChart,
  Pie,
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
} from 'recharts';

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
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine
            outerRadius={100}
            innerRadius={60}
            fill="#8884d8"
            dataKey="count"
            nameKey="status"
            label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value} jobs`, name]} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => value.replace(/_/g, ' ')}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
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
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </Box>
  );
}

// Line Chart Component
interface TimeDataPoint {
  date: string;
  value?: number;
  [key: string]: string | number | undefined;
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

  if (!data || data.length === 0) {
    return (
      <Center h={300}>
        <Text c="dimmed">No data available</Text>
      </Center>
    );
  }

  // For multi-line charts, we need to render a line for each key except 'date'
  const renderLines = () => {
    if (!multiLine) {
      return (
        <Line
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
      <Line
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
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {renderLines()}
        </RechartsLineChart>
      </ResponsiveContainer>
    </Box>
  );
}
