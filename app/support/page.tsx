'use client';

import { Anchor, Container, List, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';

export default function SupportPage() {
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
              issues, email our support team. We typically respond within one
              business day. Include your account email and a brief description of
              the issue.
            </List.Item>
          </List>
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
            Contact support
          </Title>
          <Text size="sm">
            Email:{' '}
            <Anchor href="mailto:info@jobsuite.app">
              info@jobsuite.app
            </Anchor>
          </Text>
          <Text size="sm" c="gray.7" mt="xs">
            Please include your registered email and, if relevant, the estimate
            or job ID you&apos;re asking about.
          </Text>
        </section>
      </Stack>
    </Container>
  );
}
