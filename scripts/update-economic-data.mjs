#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SERIES_CONFIG = [
  { column: 'Unemployment Rate', seriesId: 'UNRATE', cadence: 'monthly', aggregation: 'last', scale: 1 },
  { column: 'Avg Weeks Unemployeed', seriesId: 'UEMPMEAN', cadence: 'monthly', aggregation: 'last', scale: 1 },
  { column: 'Median Weeks Unemployeed', seriesId: 'UEMPMED', cadence: 'monthly', aggregation: 'last', scale: 1 },
  { column: 'Job Openings', seriesId: 'JTSJOL', cadence: 'monthly', aggregation: 'last', scale: 1 },
  { column: 'Unemployed 27 weeks', seriesId: 'UEMP27OV', cadence: 'monthly', aggregation: 'last', scale: 1 },
  { column: 'Unemployeed Count', seriesId: 'UNEMPLOY', cadence: 'monthly', aggregation: 'last', scale: 1 },
  { column: 'Fed Rate', seriesId: 'FEDFUNDS', cadence: 'monthly', aggregation: 'last', scale: 1 },
  { column: '15 year mortgage', seriesId: 'MORTGAGE15US', cadence: 'weekly', aggregation: 'last', scale: 1 },
  { column: '30 year mortgage', seriesId: 'MORTGAGE30US', cadence: 'weekly', aggregation: 'last', scale: 1 },
  { column: 'S&P 500', seriesId: 'SP500', cadence: 'daily', aggregation: 'last', scale: 1 },
  { column: 'Labor Participation Rate', seriesId: 'CIVPART', cadence: 'monthly', aggregation: 'last', scale: 1 },
  { column: 'Labor Participation Core', seriesId: 'LNS11300060', cadence: 'monthly', aggregation: 'last', scale: 1 },
  { column: 'Housing Price Index', seriesId: 'CSUSHPINSA', cadence: 'monthly', aggregation: 'last', scale: 1 },
  { column: 'CPI', seriesId: 'CPIAUCSL', cadence: 'monthly', aggregation: 'last', scale: 1 },
  { column: 'GDP', seriesId: 'GDP', cadence: 'quarterly', aggregation: 'last', scale: 1 },
  { column: 'Stock Market (b)', seriesId: 'NCBCEL', cadence: 'quarterly', aggregation: 'last', scale: 1 },
  { column: 'National Debt (b)', seriesId: 'GFDEBTN', cadence: 'quarterly', aggregation: 'last', scale: 0.001 },
];

function getArg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function monthKeyFromDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseMonthKey(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month };
}

function addMonths(monthKey, delta) {
  const { year, month } = parseMonthKey(monthKey);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function compareMonthKeys(a, b) {
  return a.localeCompare(b);
}

function getMonthRange(startMonth, endMonth) {
  const months = [];
  let cursor = startMonth;
  while (compareMonthKeys(cursor, endMonth) <= 0) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

function sanitizeNumeric(value) {
  const normalized = Math.abs(value) < 1e-12 ? 0 : value;
  return normalized.toFixed(8).replace(/\.?0+$/, '');
}

function csvEscape(value) {
  const raw = String(value);
  if (!/[",\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

async function fetchSeriesObservations(seriesId, observationStart, apiKey) {
  const query = new URLSearchParams({
    series_id: seriesId,
    file_type: 'json',
    observation_start: observationStart,
    sort_order: 'asc',
  });
  if (apiKey) query.set('api_key', apiKey);

  const url = `https://api.stlouisfed.org/fred/series/observations?${query.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FRED request failed for ${seriesId}: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload?.observations)) {
    throw new Error(`Unexpected FRED response for ${seriesId}`);
  }

  return payload.observations;
}

function aggregateToMonthly(observations, aggregation) {
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
    if (!values.length) continue;
    if (aggregation === 'average') {
      const average = values.reduce((sum, v) => sum + v, 0) / values.length;
      monthly.set(monthKey, average);
      continue;
    }
    monthly.set(monthKey, values[values.length - 1]);
  }

  return monthly;
}

function expandQuarterlyMonths(monthlyValues) {
  const expanded = new Map(monthlyValues);
  const keys = Array.from(monthlyValues.keys()).sort(compareMonthKeys);
  for (const key of keys) {
    const value = monthlyValues.get(key);
    if (!Number.isFinite(value)) continue;
    expanded.set(addMonths(key, 1), value);
    expanded.set(addMonths(key, 2), value);
  }
  return expanded;
}

function boundsFromMap(values) {
  const keys = Array.from(values.keys()).sort(compareMonthKeys);
  if (!keys.length) return null;
  return { first: keys[0], last: keys[keys.length - 1] };
}

function formatObservedDate(monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  return `${month}/1/${String(year).slice(-2)}`;
}

async function main() {
  const outputPathArg = getArg('--output', 'public/data/economic_indicators.csv');
  const outputPath = path.resolve(process.cwd(), outputPathArg);
  const observationStart = process.env.FRED_OBSERVATION_START || '2000-01-01';
  const startMonthOverride = process.env.DASHBOARD_START_MONTH || '2000-01';
  const dryRun = process.argv.includes('--dry-run');
  const fredApiKey = process.env.FRED_API_KEY;

  if (!fredApiKey) {
    console.error('Missing required env var: FRED_API_KEY');
    process.exit(1);
  }

  const seriesRows = [];
  for (const config of SERIES_CONFIG) {
    const observations = await fetchSeriesObservations(config.seriesId, observationStart, fredApiKey);
    let monthlyValues = aggregateToMonthly(observations, config.aggregation);

    if (config.cadence === 'quarterly') {
      monthlyValues = expandQuarterlyMonths(monthlyValues);
    }

    const bounds = boundsFromMap(monthlyValues);
    if (!bounds) {
      throw new Error(`No valid observations for ${config.seriesId}`);
    }

    seriesRows.push({ config, monthlyValues, bounds });
    console.log(`Fetched ${config.seriesId} -> ${bounds.first} to ${bounds.last}`);
  }

  const commonStart = seriesRows
    .map((s) => s.bounds.first)
    .sort(compareMonthKeys)
    .at(-1);
  const commonEnd = seriesRows
    .map((s) => s.bounds.last)
    .sort(compareMonthKeys)[0];

  if (!commonStart || !commonEnd) {
    throw new Error('Unable to compute common date range.');
  }

  const startMonth = compareMonthKeys(startMonthOverride, commonStart) > 0 ? startMonthOverride : commonStart;
  if (compareMonthKeys(startMonth, commonEnd) > 0) {
    throw new Error(`Computed range is invalid: ${startMonth} > ${commonEnd}`);
  }

  const months = getMonthRange(startMonth, commonEnd);

  const filledSeries = seriesRows.map((series) => {
    const filled = new Map();
    let lastValue = null;

    for (const monthKey of months) {
      const current = series.monthlyValues.get(monthKey);
      if (Number.isFinite(current)) lastValue = current;
      if (lastValue !== null) filled.set(monthKey, lastValue);
    }

    return { ...series, filled };
  });

  const headers = ['Observed Date', ...SERIES_CONFIG.map((s) => s.column)];
  const lines = [headers.join(',')];

  for (const monthKey of months) {
    const row = { 'Observed Date': formatObservedDate(monthKey) };
    let valid = true;

    for (const series of filledSeries) {
      const value = series.filled.get(monthKey);
      if (!Number.isFinite(value)) {
        valid = false;
        break;
      }
      row[series.config.column] = sanitizeNumeric(value * (series.config.scale ?? 1));
    }

    if (!valid) continue;

    const csvLine = headers.map((header) => csvEscape(row[header] ?? '')).join(',');
    lines.push(csvLine);
  }

  const csvContent = `${lines.join('\n')}\n`;
  if (dryRun) {
    console.log(`Dry run complete: ${lines.length - 1} rows (${startMonth} -> ${commonEnd}).`);
    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, csvContent, 'utf8');
  console.log(`Wrote ${lines.length - 1} rows to ${outputPath}`);
  console.log(`Coverage: ${startMonth} -> ${commonEnd}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
