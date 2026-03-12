import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

const SUPPORT_EMAIL = 'info@jobsuite.app';
const JIRA_PROJECT_KEY = 'AW';
const JIRA_ISSUE_TYPE = 'Task';

function buildJiraDescription(body: {
  name: string;
  email: string;
  subject: string;
  message: string;
  estimateOrJobId?: string;
}) {
  const text = [
    `From: ${body.name} <${body.email}>`,
    `Subject: ${body.subject}`,
    '',
    body.message,
    ...(body.estimateOrJobId
      ? ['', `Estimate/Job ID: ${body.estimateOrJobId}`]
      : []),
  ].join('\n');

  return {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
}

async function createJiraIssue(body: {
  name: string;
  email: string;
  subject: string;
  message: string;
  estimateOrJobId?: string;
}) {
  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;
  const jiraEmail = process.env.JIRA_EMAIL;

  if (!jiraBaseUrl || !jiraApiToken || !jiraEmail) {
    throw new Error(
      'Jira is not configured (JIRA_BASE_URL, JIRA_API_TOKEN, JIRA_EMAIL required)'
    );
  }

  const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
  const url = `${jiraBaseUrl}/rest/api/3/issue`;
  const payload = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: `[Support] ${body.subject}`,
      description: buildJiraDescription(body),
      issuetype: { name: JIRA_ISSUE_TYPE },
    },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  });

  return {
    key: response.data.key,
    url: `${jiraBaseUrl}/browse/${response.data.key}`,
  };
}

async function sendSupportEmail(body: {
  name: string;
  email: string;
  subject: string;
  message: string;
  estimateOrJobId?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const fromEmail =
    process.env.SUPPORT_FROM_EMAIL ?? 'JobSuite Support <onboarding@resend.dev>';
  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  const text = [
    `From: ${body.name} <${body.email}>`,
    `Subject: ${body.subject}`,
    '',
    body.message,
    ...(body.estimateOrJobId
      ? ['', `Estimate/Job ID: ${body.estimateOrJobId}`]
      : []),
  ].join('\n');

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [SUPPORT_EMAIL],
    replyTo: body.email,
    subject: `[Support] ${body.subject}`,
    text,
  });

  if (error) throw new Error(error.message);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message, estimateOrJobId } = body;

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { message: 'Name, email, subject, and message are required' },
        { status: 400 }
      );
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
      estimateOrJobId: estimateOrJobId?.trim() || undefined,
    };

    const jira = await createJiraIssue(payload);

    try {
      await sendSupportEmail(payload);
    } catch (emailError) {
      // eslint-disable-next-line no-console
      console.error('Support email failed (Jira ticket was created):', emailError);
      return NextResponse.json(
        {
          message: 'Ticket created but email could not be sent. Our team will still see your request in Jira.',
          jiraKey: jira.key,
          jiraUrl: jira.url,
        },
        { status: 201 }
      );
    }

    return NextResponse.json({
      message: 'Support request submitted. We typically respond within one business day.',
      jiraKey: jira.key,
      jiraUrl: jira.url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit support request';
    return NextResponse.json({ message }, { status: 500 });
  }
}
