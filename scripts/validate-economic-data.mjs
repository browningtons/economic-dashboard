#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SERIES_CONFIG = [
  { column: 'Unemployment Rate', seriesId: 'UNRATE', cadence: 'monthly', scale: 1, threshold: 0.15, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: 'Avg Weeks Unemployeed', seriesId: 'UEMPMEAN', cadence: 'monthly', scale: 1, threshold: 1.5, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: 'Median Weeks Unemployeed', seriesId: 'UEMPMED', cadence: 'monthly', scale: 1, threshold: 1.5, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: 'Job Openings', seriesId: 'JTSJOL', cadence: 'monthly', scale: 1, threshold: 350, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: 'Unemployed 27 weeks', seriesId: 'UEMP27OV', cadence: 'monthly', scale: 1, threshold: 300, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: 'Unemployeed Count', seriesId: 'UNEMPLOY', cadence: 'monthly', scale: 1, threshold: 400, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: 'Fed Rate', seriesId: 'FEDFUNDS', cadence: 'monthly', scale: 1, threshold: 0.2, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: '15 year mortgage', seriesId: 'MORTGAGE15US', cadence: 'weekly', scale: 1, threshold: 0.15, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: '30 year mortgage', seriesId: 'MORTGAGE30US', cadence: 'weekly', scale: 1, threshold: 0.15, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: 'S&P 500', seriesId: 'SP500', cadence: 'daily', scale: 1, threshold: 125, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: 'Labor Participation Rate', seriesId: 'CIVPART', cadence: 'monthly', scale: 1, threshold: 0.2, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: 'Labor Participation Core', seriesId: 'LNS11300060', cadence: 'monthly', scale: 1, threshold: 0.2, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: 'Housing Price Index', seriesId: 'CSUSHPINSA', cadence: 'monthly', scale: 1, threshold: 1.0, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: 'CPI', seriesId: 'CPIAUCSL', cadence: 'monthly', scale: 1, threshold: 1.0, maxLagMonths: 2, maxForwardFillMonths: 0 },
  { column: 'GDP', seriesId: 'GDP', cadence: 'quarterly', scale: 1, threshold: 10, maxLagMonths: 3, maxForwardFillMonths: 2 },
  { column: 'Stock Market (b)', seriesId: 'NCBCEL', cadence: 'quarterly', scale: 0.001, threshold: 2500, maxLagMonths: 3, maxForwardFillMonths: 2 },
  { column: 'National Debt (b)', seriesId: 'GFDEBTN', cadence: 'quarterly', scale: 0.001, threshold: 400, maxLagMonths: 3, maxForwardFillMonths: 2 },
];

function monthKeyFromDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parseObservedMonth(dateStr) {
  const [m, _d, y] = dateStr.split('/').map(Number);
  const year = y < 100 ? 2000 + y : y;
  return `${year}-${String(m).padStart(2, '0')}`;
}

function addMonths(monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthDiff(older, newer) {
  const [y1, m1] = older.split('-').map(Number);
  const [y2, m2] = newer.split('-').map(Number);
  return ((y2 - y1) * 12) + (m2 - m1);
}

function compareMonthKeys(a, b) {
  return a.localeCompare(b);
}

function getRecentMonths(monthKeys, count) {
  return [...monthKeys].sort(compareMonthKeys).slice(-count);
}

function aggregateToMonthly(observations) {
  const grouped = new Map();
  for (const observation of observations) {
    const value = Number(observation.value);
    if (!Number.isFinite(value)) continue;
    const monthKey = monthKeyFromDate(observation.date);
    if (!monthKey) continue;
    if (!grouped.has(monthKey)) grouped.set(monthKey, []);
    grouped.get(monthKey).push(value);
  }

  const monthly = new Map();
  for (const [monthKey, values] of grouped.entries()) {
    monthly.set(monthKey, values[values.length - 1]);
  }
  return monthly;
}

function expandQuarterlyMonths(monthlyValues) {
  const expanded = new Map(monthlyValues);
  for (const key of [...monthlyValues.keys()].sort(compareMonthKeys)) {
    const value = monthlyValues.get(key);
    if (!Number.isFinite(value)) continue;
    expanded.set(addMonths(key, 1), value);
    expanded.set(addMonths(key, 2), value);
  }
  return expanded;
}

async function fetchSeries(seriesId, apiKey, observationStart) {
  const query = new URLSearchParams({
    series_id: seriesId,
    file_type: 'json',
    observation_start: observationStart,
    sort_order: 'asc',
  });
  query.set('api_key', apiKey);
  const url = `https://api.stlouisfed.org/fred/series/observations?${query.toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${seriesId}: HTTP ${response.status}`);
  const payload = await response.json();
  if (!Array.isArray(payload?.observations)) {
    throw new Error(`${seriesId}: unexpected API response`);
  }
  return payload.observations;
}

async function main() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.error('Missing FRED_API_KEY');
    process.exit(1);
  }

  const csvPath = path.resolve(process.cwd(), 'public/data/economic_indicators.csv');
  const reportPath = path.resolve(process.cwd(), 'reports/data-validation-latest.md');
  const observationStart = process.env.VALIDATE_OBSERVATION_START || '2024-01-01';
  const compareMonths = Number(process.env.VALIDATE_MONTH_WINDOW || 6);

  const raw = await readFile(csvPath, 'utf8');
  const lines = raw.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map((line) => line.split(','));
  const rowByMonth = new Map();
  for (const row of rows) rowByMonth.set(parseObservedMonth(row[0]), row);

  const failures = [];
  const summaries = [];
  const mismatchRows = [];

  for (const config of SERIES_CONFIG) {
    const colIndex = headers.indexOf(config.column);
    if (colIndex === -1) {
      failures.push(`${config.column}: column missing in CSV`);
      continue;
    }

    const observations = await fetchSeries(config.seriesId, apiKey, observationStart);
    let fredMonthly = aggregateToMonthly(observations);
    if (config.cadence === 'quarterly') fredMonthly = expandQuarterlyMonths(fredMonthly);

    const fredMonths = [...fredMonthly.keys()].sort(compareMonthKeys);
    const fredLatest = fredMonths.at(-1);

    let csvLatest = null;
    for (const [month, row] of [...rowByMonth.entries()].sort((a, b) => compareMonthKeys(a[0], b[0]))) {
      const value = Number(row[colIndex]);
      if (Number.isFinite(value)) csvLatest = month;
    }

    let lag = null;
    let forwardFill = 0;
    if (csvLatest && fredLatest) {
      lag = Math.max(0, monthDiff(csvLatest, fredLatest));
      forwardFill = Math.max(0, monthDiff(fredLatest, csvLatest));
    }

    const overlapMonths = getRecentMonths(
      fredMonths.filter((m) => rowByMonth.has(m)),
      compareMonths
    );

    let mismatchCount = 0;
    let maxAbsDiff = 0;
    for (const month of overlapMonths) {
      const fredValue = Number(fredMonthly.get(month)) * (config.scale ?? 1);
      const csvValue = Number(rowByMonth.get(month)[colIndex]);
      if (!Number.isFinite(fredValue) || !Number.isFinite(csvValue)) continue;

      const absDiff = Math.abs(fredValue - csvValue);
      maxAbsDiff = Math.max(maxAbsDiff, absDiff);
      if (absDiff > config.threshold) {
        mismatchCount += 1;
        mismatchRows.push({
          column: config.column,
          seriesId: config.seriesId,
          month,
          fredValue,
          csvValue,
          absDiff,
          threshold: config.threshold,
        });
      }
    }

    const lagFailed = lag !== null && lag > config.maxLagMonths;
    const forwardFillFailed = forwardFill > (config.maxForwardFillMonths ?? 0);
    const mismatchFailed = mismatchCount > 0;
    const status = lagFailed || mismatchFailed || forwardFillFailed ? 'FAIL' : 'PASS';

    if (lagFailed) {
      failures.push(`${config.column}: lag ${lag} months > ${config.maxLagMonths} months`);
    }
    if (mismatchFailed) {
      failures.push(`${config.column}: ${mismatchCount} threshold breaches (max abs diff ${maxAbsDiff.toFixed(4)})`);
    }
    if (forwardFillFailed) {
      failures.push(`${config.column}: forward-filled ${forwardFill} months beyond latest source (limit ${config.maxForwardFillMonths ?? 0})`);
    }

    summaries.push({
      column: config.column,
      seriesId: config.seriesId,
      status,
      csvLatest: csvLatest ?? 'n/a',
      fredLatest: fredLatest ?? 'n/a',
      lag: lag ?? 'n/a',
      forwardFill,
      threshold: config.threshold,
      maxAbsDiff: maxAbsDiff.toFixed(4),
      mismatchCount,
    });
  }

  mismatchRows.sort((a, b) => b.absDiff - a.absDiff);
  const topInvestigations = mismatchRows.slice(0, 8);

  const reportLines = [
    '# Data Validation Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `CSV path: ${csvPath}`,
    '',
    '## Series Summary',
    '',
    '| Column | Series | Status | CSV Latest | FRED Latest | Source Lag (months) | Forward-Fill (months) | Threshold | Max Abs Diff | Breaches |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---:|',
    ...summaries.map((s) => `| ${s.column} | ${s.seriesId} | ${s.status} | ${s.csvLatest} | ${s.fredLatest} | ${s.lag} | ${s.forwardFill} | ${s.threshold} | ${s.maxAbsDiff} | ${s.mismatchCount} |`),
    '',
    '## Top Investigations',
    '',
  ];

  if (topInvestigations.length === 0) {
    reportLines.push('No threshold breaches detected in the current comparison window.');
  } else {
    reportLines.push('| Column | Series | Month | FRED | CSV | Abs Diff | Threshold |');
    reportLines.push('|---|---|---:|---:|---:|---:|---:|');
    reportLines.push(...topInvestigations.map((r) => `| ${r.column} | ${r.seriesId} | ${r.month} | ${r.fredValue.toFixed(4)} | ${r.csvValue.toFixed(4)} | ${r.absDiff.toFixed(4)} | ${r.threshold} |`));
  }

  if (failures.length > 0) {
    reportLines.push('', '## Failures', '', ...failures.map((f) => `- ${f}`));
  }

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${reportLines.join('\n')}\n`, 'utf8');

  console.log(`Validation report written to ${reportPath}`);
  if (failures.length > 0) {
    console.error(`Validation failed with ${failures.length} issue(s).`);
    process.exit(1);
  }

  console.log('Validation passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
