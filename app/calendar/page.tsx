'use client';

import { Suspense } from 'react';

import { Center, Loader } from '@mantine/core';

import { CalendarPage } from '@/components/Calendar/CalendarPage';

function CalendarFallback() {
  return (
    <Center p="xl">
      <Loader />
    </Center>
  );
}

export default function CalendarRoutePage() {
  return (
    <Suspense fallback={<CalendarFallback />}>
      <CalendarPage />
    </Suspense>
  );
}
