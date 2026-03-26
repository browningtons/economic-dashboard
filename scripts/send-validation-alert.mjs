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

async function readStatus(statusPath) {
  try {
    const raw = await readFile(statusPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* ── Design tokens (matched to dashboard theme.css) ─────────────── */
const COLORS = {
  text: '#0F172A',
  textMuted: '#64748B',
  link: '#2CB6C0',
  accent: '#F04A00',
  secondaryAccent: '#0F3D57',
  bgPage: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgCardAlt: '#F1F5F9',
  border: '#E2E8F0',
  pass: '#059669',
  passBg: '#ECFDF5',
  fail: '#DC2626',
  failBg: '#FEF2F2',
  warn: '#D97706',
  warnBg: '#FFFBEB',
};

/* ── HTML email builder ─────────────────────────────────────────── */

function statusColor(status) {
  if (status === 'PASS') return COLORS.pass;
  if (status === 'WARN') return COLORS.warn;
  return COLORS.fail;
}

function statusBg(status) {
  if (status === 'PASS') return COLORS.passBg;
  if (status === 'WARN') return COLORS.warnBg;
  return COLORS.failBg;
}

function statusLabel(status) {
  if (status === 'PASS') return 'All Clear';
  if (status === 'WARN') return 'Warnings';
  return 'Issues Found';
}

function pill(label, color, bg) {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;letter-spacing:0.5px;color:${color};background:${bg};text-transform:uppercase;">${label}</span>`;
}

function formatDate(isoString) {
  if (!isoString) return 'N/A';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function buildHtmlEmail(status, report) {
  const overallStatus = status?.status ?? 'UNKNOWN';
  const failureCount = status?.failureCount ?? 0;
  const warningCount = status?.warningCount ?? 0;
  const totalSeries = status?.totalSeriesCount ?? 0;
  const failedSeries = status?.failedSeriesCount ?? 0;
  const passedSeries = totalSeries - failedSeries;
  const latestMonth = status?.latestDataMonth ?? 'N/A';
  const generatedAt = status?.generatedAt;
  const nextRefresh = status?.nextScheduledRefreshUtc;
  const failures = status?.failures ?? [];
  const warnings = status?.warnings ?? [];
  const topAlerts = status?.topAlerts ?? [];
  const series = status?.series ?? [];

  const headerColor = overallStatus === 'PASS' ? COLORS.pass : COLORS.fail;
  const headerBg = overallStatus === 'PASS' ? COLORS.passBg : COLORS.failBg;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${COLORS.bgPage};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${COLORS.text};line-height:1.5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bgPage};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:${COLORS.secondaryAccent};border-radius:12px 12px 0 0;padding:28px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><span style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">Economic Dashboard</span><br>
        <span style="font-size:13px;color:rgba(255,255,255,0.7);">Data Validation Report</span></td>
        <td align="right" valign="top">${pill(statusLabel(overallStatus), overallStatus === 'PASS' ? COLORS.pass : '#FFFFFF', overallStatus === 'PASS' ? COLORS.passBg : COLORS.fail)}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Status banner -->
  <tr><td style="background:${headerBg};padding:20px 32px;border-left:1px solid ${COLORS.border};border-right:1px solid ${COLORS.border};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align:center;padding:0 8px;">
          <span style="font-size:28px;font-weight:700;color:${headerColor};">${failureCount}</span><br>
          <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;">${failureCount === 1 ? 'Failure' : 'Failures'}</span>
        </td>
        <td style="text-align:center;padding:0 8px;">
          <span style="font-size:28px;font-weight:700;color:${warningCount > 0 ? COLORS.warn : COLORS.pass};">${warningCount}</span><br>
          <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;">${warningCount === 1 ? 'Warning' : 'Warnings'}</span>
        </td>
        <td style="text-align:center;padding:0 8px;">
          <span style="font-size:28px;font-weight:700;color:${COLORS.pass};">${passedSeries}</span>
          <span style="font-size:16px;color:${COLORS.textMuted};">/ ${totalSeries}</span><br>
          <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;">Series OK</span>
        </td>
        <td style="text-align:center;padding:0 8px;">
          <span style="font-size:28px;font-weight:700;color:${COLORS.text};">${latestMonth}</span><br>
          <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;">Latest Data</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:${COLORS.bgCard};padding:0 32px 24px;border-left:1px solid ${COLORS.border};border-right:1px solid ${COLORS.border};">

    ${failures.length > 0 ? `
    <!-- Failures -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr><td style="padding-bottom:12px;">
        <span style="font-size:13px;font-weight:700;color:${COLORS.fail};text-transform:uppercase;letter-spacing:0.5px;">Failures</span>
      </td></tr>
      ${failures.map((f) => `
      <tr><td style="padding:10px 14px;background:${COLORS.failBg};border-left:3px solid ${COLORS.fail};border-radius:4px;margin-bottom:6px;">
        <span style="font-size:13px;color:${COLORS.text};">${escapeHtml(f)}</span>
      </td></tr>
      <tr><td style="height:6px;"></td></tr>`).join('')}
    </table>` : ''}

    ${warnings.length > 0 ? `
    <!-- Warnings -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr><td style="padding-bottom:12px;">
        <span style="font-size:13px;font-weight:700;color:${COLORS.warn};text-transform:uppercase;letter-spacing:0.5px;">Warnings</span>
      </td></tr>
      ${warnings.map((w) => `
      <tr><td style="padding:10px 14px;background:${COLORS.warnBg};border-left:3px solid ${COLORS.warn};border-radius:4px;">
        <span style="font-size:13px;color:${COLORS.text};">${escapeHtml(w)}</span>
      </td></tr>
      <tr><td style="height:6px;"></td></tr>`).join('')}
    </table>` : ''}

    <!-- Series overview -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr><td style="padding-bottom:12px;">
        <span style="font-size:13px;font-weight:700;color:${COLORS.secondaryAccent};text-transform:uppercase;letter-spacing:0.5px;">Series Overview</span>
      </td></tr>
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;">
          <tr style="background:${COLORS.bgCardAlt};">
            <td style="padding:8px 12px;font-size:11px;font-weight:700;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid ${COLORS.border};">Metric</td>
            <td style="padding:8px 12px;font-size:11px;font-weight:700;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid ${COLORS.border};text-align:center;">Status</td>
            <td style="padding:8px 12px;font-size:11px;font-weight:700;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid ${COLORS.border};text-align:right;">CSV Latest</td>
            <td style="padding:8px 12px;font-size:11px;font-weight:700;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid ${COLORS.border};text-align:right;">Source</td>
            <td style="padding:8px 12px;font-size:11px;font-weight:700;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid ${COLORS.border};text-align:center;">Window</td>
          </tr>
          ${series.map((s, i) => {
            const rowBg = i % 2 === 0 ? COLORS.bgCard : COLORS.bgCardAlt;
            const sc = statusColor(s.status);
            const sb = statusBg(s.status);
            return `<tr style="background:${rowBg};">
              <td style="padding:7px 12px;font-size:13px;color:${COLORS.text};border-bottom:1px solid ${COLORS.border};">${escapeHtml(s.column)}</td>
              <td style="padding:7px 12px;text-align:center;border-bottom:1px solid ${COLORS.border};">${pill(s.status, sc, sb)}</td>
              <td style="padding:7px 12px;font-size:13px;color:${COLORS.text};text-align:right;border-bottom:1px solid ${COLORS.border};font-variant-numeric:tabular-nums;">${s.csvLatest}</td>
              <td style="padding:7px 12px;font-size:13px;color:${COLORS.textMuted};text-align:right;border-bottom:1px solid ${COLORS.border};font-variant-numeric:tabular-nums;">${s.sourceLatest}</td>
              <td style="padding:7px 12px;text-align:center;border-bottom:1px solid ${COLORS.border};">${pill(s.releaseWindowStatus, statusColor(s.releaseWindowStatus), statusBg(s.releaseWindowStatus))}</td>
            </tr>`;
          }).join('')}
        </table>
      </td></tr>
    </table>

    ${topAlerts.length > 0 ? `
    <!-- Top alerts -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr><td style="padding-bottom:12px;">
        <span style="font-size:13px;font-weight:700;color:${COLORS.secondaryAccent};text-transform:uppercase;letter-spacing:0.5px;">Top Alerts</span>
      </td></tr>
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;">
          <tr style="background:${COLORS.bgCardAlt};">
            <td style="padding:8px 12px;font-size:11px;font-weight:700;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid ${COLORS.border};">Type</td>
            <td style="padding:8px 12px;font-size:11px;font-weight:700;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid ${COLORS.border};">Metric</td>
            <td style="padding:8px 12px;font-size:11px;font-weight:700;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid ${COLORS.border};">Month</td>
            <td style="padding:8px 12px;font-size:11px;font-weight:700;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid ${COLORS.border};">Details</td>
          </tr>
          ${topAlerts.map((a, i) => {
            const rowBg = i % 2 === 0 ? COLORS.bgCard : COLORS.bgCardAlt;
            return `<tr style="background:${rowBg};">
              <td style="padding:7px 12px;font-size:12px;color:${COLORS.textMuted};border-bottom:1px solid ${COLORS.border};">${escapeHtml(a.type)}</td>
              <td style="padding:7px 12px;font-size:13px;color:${COLORS.text};border-bottom:1px solid ${COLORS.border};">${escapeHtml(a.column)}</td>
              <td style="padding:7px 12px;font-size:13px;color:${COLORS.text};border-bottom:1px solid ${COLORS.border};font-variant-numeric:tabular-nums;">${escapeHtml(a.month)}</td>
              <td style="padding:7px 12px;font-size:12px;color:${COLORS.textMuted};border-bottom:1px solid ${COLORS.border};">${escapeHtml(a.details)}</td>
            </tr>`;
          }).join('')}
        </table>
      </td></tr>
    </table>` : ''}

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:${COLORS.bgCardAlt};border:1px solid ${COLORS.border};border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:12px;color:${COLORS.textMuted};">
          Generated ${formatDate(generatedAt)}<br>
          ${nextRefresh ? `Next scheduled refresh: ${formatDate(nextRefresh)}` : ''}
        </td>
        <td align="right" style="font-size:12px;color:${COLORS.textMuted};">
          Economic Dashboard v2<br>
          Automated Validation Pipeline
        </td>
      </tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Plain-text fallback (kept for webhook + text part) ─────────── */

function buildPlainTextSummary(status) {
  if (!status) return 'Validation failed. See attached report for details.';
  const lines = [
    `Status: ${status.status ?? 'UNKNOWN'}`,
    `Failures: ${status.failureCount ?? 0}`,
    `Warnings: ${status.warningCount ?? 0}`,
    `Series: ${(status.totalSeriesCount ?? 0) - (status.failedSeriesCount ?? 0)}/${status.totalSeriesCount ?? 0} passing`,
    status.latestDataMonth ? `Latest data: ${status.latestDataMonth}` : null,
    '',
  ].filter((l) => l !== null);

  if (status.failures?.length > 0) {
    lines.push('FAILURES:', ...status.failures.map((f) => `  - ${f}`), '');
  }
  if (status.warnings?.length > 0) {
    lines.push('WARNINGS:', ...status.warnings.map((w) => `  - ${w}`), '');
  }
  return lines.join('\n');
}

/* ── Transport ──────────────────────────────────────────────────── */

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

async function sendResendAlert(apiKey, from, toList, subject, textBody, htmlBody) {
  const payload = {
    from,
    to: toList,
    subject,
    text: textBody,
  };
  if (htmlBody) payload.html = htmlBody;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend alert failed: HTTP ${response.status} ${body}`);
  }
}

/* ── Main ───────────────────────────────────────────────────────── */

async function main() {
  const reportPath = path.resolve(process.cwd(), process.env.ALERT_REPORT_PATH || 'reports/data-validation-latest.md');
  const statusPath = path.resolve(process.cwd(), process.env.ALERT_STATUS_PATH || 'reports/data-status-latest.json');
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
  const status = await readStatus(statusPath);
  const plainText = buildPlainTextSummary(status);
  const htmlEmail = status ? buildHtmlEmail(status, report) : null;

  const statusEmoji = status?.status === 'PASS' ? 'All Clear' : 'Issues Found';
  const enrichedSubject = `${subject} — ${statusEmoji} (${status?.failedSeriesCount ?? '?'}/${status?.totalSeriesCount ?? '?'} failing)`;

  const errors = [];

  if (hasWebhook) {
    try {
      await sendWebhookAlert(webhookUrl, enrichedSubject, plainText, report.slice(0, 60000));
      console.log('Webhook alert sent.');
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (hasResend) {
    try {
      await sendResendAlert(resendApiKey, resendFrom, resendTo, enrichedSubject, plainText, htmlEmail);
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
