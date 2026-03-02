#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

async function readReport(reportPath) {
  try {
    return await readFile(reportPath, 'utf8');
  } catch {
    return 'Validation failed but the report file could not be read.';
  }
}

function summarizeFailures(report) {
  const lines = report.split(/\r?\n/);
  const failureStart = lines.findIndex((line) => line.trim() === '## Failures');
  if (failureStart === -1) {
    return 'Validation failed. See attached report for details.';
  }

  const failureLines = [];
  for (let i = failureStart + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('## ')) break;
    if (line.startsWith('- ')) failureLines.push(line.slice(2));
  }

  if (failureLines.length === 0) {
    return 'Validation failed. See attached report for details.';
  }

  return failureLines.slice(0, 6).map((line) => `- ${line}`).join('\n');
}

async function sendWebhookAlert(url, subject, summary, report) {
  const payload = {
    text: `${subject}\n\n${summary}`,
    report,
    generatedAt: new Date().toISOString(),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook alert failed: HTTP ${response.status}`);
  }
}

async function sendResendAlert(apiKey, from, toList, subject, summary, report) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: toList,
      subject,
      text: `${summary}\n\n${report}`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend alert failed: HTTP ${response.status} ${body}`);
  }
}

async function main() {
  const reportPath = path.resolve(process.cwd(), process.env.ALERT_REPORT_PATH || 'reports/data-validation-latest.md');
  const subject = process.env.ALERT_SUBJECT || 'Economic Dashboard data validation alert';

  const webhookUrl = process.env.ALERT_WEBHOOK_URL?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const resendFrom = process.env.RESEND_FROM_EMAIL?.trim();
  const resendTo = (process.env.RESEND_TO_EMAIL || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const hasWebhook = Boolean(webhookUrl);
  const hasResend = Boolean(resendApiKey && resendFrom && resendTo.length > 0);

  if (!hasWebhook && !hasResend) {
    console.log('No alert transport configured. Skipping external alert dispatch.');
    return;
  }

  const report = await readReport(reportPath);
  const summary = summarizeFailures(report);
  const errors = [];

  if (hasWebhook) {
    try {
      await sendWebhookAlert(webhookUrl, subject, summary, report.slice(0, 60000));
      console.log('Webhook alert sent.');
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (hasResend) {
    try {
      await sendResendAlert(resendApiKey, resendFrom, resendTo, subject, summary, report.slice(0, 60000));
      console.log('Resend alert sent.');
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length > 0) {
    throw new Error(`External alert dispatch failed:\n${errors.map((msg) => `- ${msg}`).join('\n')}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
