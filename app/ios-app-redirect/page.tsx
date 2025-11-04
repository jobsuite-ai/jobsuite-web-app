'use client';

import { Container, Title, Text, Button, Paper } from '@mantine/core';

export default function IOSAppRedirectPage() {
  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900}>
        Welcome to Jobsuite!
      </Title>
      <Text ta="center" c="dimmed" size="sm" mt={5}>
        To get started, please download our iOS app
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Button 
          fullWidth 
          component="a" 
          href="https://apps.apple.com/app/jobsuite" 
          target="_blank"
          mb="md"
        >
          Download iOS App
        </Button>
      </Paper>
    </Container>
  );
} 