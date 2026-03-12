'use client';

import { useState } from 'react';

import {
  Anchor,
  Button,
  Container,
  List,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';

export default function SupportPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [estimateOrJobId, setEstimateOrJobId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      notifications.show({
        title: 'Missing fields',
        message: 'Please fill in name, email, subject, and message.',
        color: 'red',
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          estimateOrJobId: estimateOrJobId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to submit');
      }
      notifications.show({
        title: 'Request sent',
        message: data.message ?? 'We typically respond within one business day.',
        color: 'green',
      });
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setEstimateOrJobId('');
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Something went wrong.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Anchor component={Link} href="/" size="sm" c="gray.7" mb="md">
        ← Back to JobSuite
      </Anchor>

      <Title order={1} c="dark.7" mb="xl">
        Support
      </Title>

      <Stack gap="lg" c="gray.8">
        <Text size="sm">
          We&apos;re here to help you get the most out of JobSuite. Use the resources below for
          product help, account questions, and technical support.
        </Text>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            Getting help
          </Title>
          <List size="sm" spacing="xs">
            <List.Item>
              <strong>In-app help:</strong> From the web app, open Settings for
              configuration options, message templates, and integrations. Use the
              Profile and navigation to access estimates, clients, and jobs.
            </List.Item>
            <List.Item>
              <strong>Mobile app:</strong> In the JobSuite mobile app, go to
              Profile → Support &amp; Legal for links to this Support page and
              our Privacy Policy.
            </List.Item>
            <List.Item>
              <strong>Contact us:</strong> For account, billing, or technical
              issues, submit the form below or email our support team. We
              typically respond within one business day.
            </List.Item>
          </List>
        </section>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            Submit a support request
          </Title>
          <Paper withBorder p="md" radius="md">
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="Name"
                  placeholder="Your name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
                <TextInput
                  label="Email"
                  type="email"
                  placeholder="your.email@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <TextInput
                  label="Subject"
                  placeholder="Brief summary of your issue"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <Textarea
                  label="Message"
                  placeholder="Describe your issue or question in detail..."
                  required
                  minRows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <TextInput
                  label="Estimate or job ID (optional)"
                  placeholder="e.g. estimate ID or job reference"
                  value={estimateOrJobId}
                  onChange={(e) => setEstimateOrJobId(e.target.value)}
                />
                <Button type="submit" loading={loading}>
                  Submit request
                </Button>
              </Stack>
            </form>
          </Paper>
        </section>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            Privacy and legal
          </Title>
          <Text size="sm">
            For our privacy practices and how we handle your data, see our{' '}
            <Anchor component={Link} href="/privacy">
              Privacy Policy
            </Anchor>
            .
          </Text>
        </section>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            Email
          </Title>
          <Text size="sm">
            You can also reach us at{' '}
            <Anchor href="mailto:info@jobsuite.app">
              info@jobsuite.app
            </Anchor>
            .
          </Text>
        </section>
      </Stack>
    </Container>
  );
}
