'use client';

import { useState } from 'react';

import { Modal, Button, TextInput, Textarea, Group, Stack, MultiSelect } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { IconCalendarPlus } from '@tabler/icons-react';

import LoadingState from '../Global/LoadingState';
import { DynamoClient } from '../Global/model';

import { login } from '@/utils/microsoftAuth';

interface ScheduleOutlookEventProps {
  jobId: string;
  existingEvent: boolean;
  clientId: string;
  clientName: string;
  jobTitle?: string;
  onEventCreated: (eventUrl: string) => void;
}

export default function ScheduleOutlookEvent({
  jobId,
  existingEvent,
  clientId,
  clientName,
  jobTitle,
  onEventCreated,
}: ScheduleOutlookEventProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<DynamoClient | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const [subject, setSubject] = useState(`Estimate for ${jobTitle}`);
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [endDateTime, setEndDateTime] = useState<Date | null>(null);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [body, setBody] = useState(`Estimate appointment for ${clientName} regarding ${jobTitle}`);

  // Fetch client details when the modal is opened
  const handleOpen = async () => {
    open();
    if (!client && !clientLoading) {
      setClientLoading(true);
      try {
        const response = await fetch(`/api/clients/${clientId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const { Item } = await response.json();
        setClient(Item);

        // Set attendees with client email
        if (Item?.email?.S) {
          setAttendees([Item.email.S]);
        }
      } catch (error) {
        console.error('Error fetching client details:', error);
      } finally {
        setClientLoading(false);
      }
    }
  };

  const handleLogin = async () => {
    try {
      const loginResponse = await login();
      if (loginResponse) {
        // Now that we're logged in, we can proceed with opening the modal
        handleOpen();
      } else {
        console.error('Login failed');
      }
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const handleSubmit = async () => {
    if (!startDateTime || !endDateTime || attendees.length === 0) {
      // Show error
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/calendar/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          attendees,
          location,
          body,
          jobId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      const data = await response.json();
      onEventCreated(data.event.url);
      close();
    } catch (error) {
      console.error('Error scheduling event:', error);
      // Show error notification
    } finally {
      setLoading(false);
    }
  };

  // Calculate end time as 1 hour after start time when start time changes
  const handleStartTimeChange = (date: Date | null) => {
    setStartDateTime(date);
    if (date) {
      const newEndTime = new Date(date);
      newEndTime.setHours(date.getHours() + 1);
      setEndDateTime(newEndTime);
    }
  };

  return (
    <>
      <Button
        leftSection={<IconCalendarPlus size={16} />}
        onClick={handleLogin}
        variant="outline"
        color="blue"
      >
        {existingEvent ? 'Reschedule Estimate' : 'Schedule Estimate'}
      </Button>

      <Modal opened={opened} onClose={close} title="Schedule Estimate Appointment" size="lg">
        {clientLoading ? (
          <LoadingState />
        ) : (
          <Stack gap="md">
            <TextInput
              label="Subject"
              placeholder="Estimate Appointment"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />

            <Group grow>
              <DateTimePicker
                label="Start Time"
                placeholder="Select date and time"
                value={startDateTime}
                onChange={handleStartTimeChange}
                required
                clearable={false}
              />
              <DateTimePicker
                label="End Time"
                placeholder="Select date and time"
                value={endDateTime}
                onChange={setEndDateTime}
                required
                clearable={false}
              />
            </Group>

            <MultiSelect
              label="Attendees"
              placeholder="Add email addresses"
              data={attendees}
              value={attendees}
              onChange={setAttendees}
              searchable
              required
            />

            <TextInput
              label="Location"
              placeholder="Meeting location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <Textarea
              label="Description"
              placeholder="Meeting details"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              minRows={3}
            />

            <Group align="right" mt="md">
              <Button variant="subtle" onClick={close}>Cancel</Button>
              <Button loading={loading} onClick={handleSubmit}>Schedule Event</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
