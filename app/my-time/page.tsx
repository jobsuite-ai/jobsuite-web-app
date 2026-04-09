'use client';

import { Suspense } from 'react';

import { Center, Loader } from '@mantine/core';
import '@mantine/dates/styles.css';

import { MyTimePage } from '@/components/Employee/MyTimePage';

function Fallback() {
  return (
    <Center p="xl">
      <Loader />
    </Center>
  );
}

export default function MyTimeRoutePage() {
  return (
    <Suspense fallback={<Fallback />}>
      <MyTimePage />
    </Suspense>
  );
}
