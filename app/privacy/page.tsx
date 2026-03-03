'use client';

import { Anchor, Container, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <Container size="md" py="xl">
      <Anchor component={Link} href="/" size="sm" c="gray.7" mb="md">
        ← Back to JobSuite
      </Anchor>

      <Title order={1} c="dark.7" mb="xl">
        Privacy Policy
      </Title>

      <Stack gap="lg" c="gray.8">
        <Text size="sm" c="gray.7">
          Last updated: March 2025
        </Text>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            1. Introduction
          </Title>
          <Text size="sm">
            JobSuite (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) provides a platform for
            contractors and construction professionals to manage clients, jobs, estimates, and
            related documentation. This Privacy Policy describes how we collect, use, and protect
            your information when you use our web application, mobile application, and related
            services.
          </Text>
        </section>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            2. Information We Collect
          </Title>
          <Text size="sm" mb="xs">
            We collect information you provide directly and information generated through use of
            our services:
          </Text>
          <Text size="sm" component="span">
            <strong>Account and profile information:</strong> Name, email address, phone number,
            business name, and address when you register or update your contractor profile.
          </Text>
          <Text size="sm" mt="xs">
            <strong>Client and job data:</strong> Client names, contact details, job addresses,
            estimates, line items, notes, and other information you enter in the app or web app.
          </Text>
          <Text size="sm" mt="xs">
            <strong>Media and documents:</strong> Photos, videos, room scans, and other files you
            upload to document jobs or attach to estimates.
          </Text>
          <Text size="sm" mt="xs">
            <strong>Usage data:</strong> Device information, log data, and usage patterns to operate
            and improve our services.
          </Text>
        </section>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            3. How We Use Your Information
          </Title>
          <Text size="sm">
            We use the information we collect to provide, maintain, and improve JobSuite; to process
            estimates and signatures; to send transactional and support communications; to protect
            against fraud and abuse; and to comply with legal obligations. We do not sell your
            personal information to third parties.
          </Text>
        </section>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            4. Data Storage and Security
          </Title>
          <Text size="sm">
            Your data is stored on secure servers. We use industry-standard measures to protect data
            in transit and at rest. Access to personal data is limited to authorized personnel and
            service providers who need it to operate our services.
          </Text>
        </section>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            5. Data Retention
          </Title>
          <Text size="sm">
            We retain your account and job data for as long as your account is active or as
            needed to provide you services. You may request deletion of your account and
            associated data by contacting support. We may retain certain information as
            required by law or for legitimate business purposes after account deletion.
          </Text>
        </section>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            6. Your Rights
          </Title>
          <Text size="sm">
            Depending on your location, you may have rights to access, correct, delete, or port your
            personal data, or to object to or restrict certain processing. To exercise these rights,
            contact us using the support link or email provided in the app and on our website.
          </Text>
        </section>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            7. Cookies and Similar Technologies
          </Title>
          <Text size="sm">
            We use cookies and similar technologies to maintain your session, remember preferences,
            and analyze usage. You can control cookie settings through your browser.
          </Text>
        </section>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            8. Changes to This Policy
          </Title>
          <Text size="sm">
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by posting the updated policy and updating the &quot;Last updated&quot;
            date. Your continued use of JobSuite after changes constitutes
            acceptance of the updated policy.
          </Text>
        </section>

        <section>
          <Title order={2} size="h4" c="dark.7" mb="xs">
            9. Contact Us
          </Title>
          <Text size="sm">
            For questions about this Privacy Policy or our data practices, please contact us through
            our <Anchor component={Link} href="/support">Support</Anchor> page.
          </Text>
        </section>
      </Stack>
    </Container>
  );
}
