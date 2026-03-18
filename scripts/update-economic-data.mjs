#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STOCK_MARKET_COLUMN = 'Stock Market (b)';

const SERIES_CONFIG = [
  { column: 'Unemployment Rate', seriesId: 'UNRATE', cadence: 'monthly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 0 },
  { column: 'Avg Weeks Unemployeed', seriesId: 'UEMPMEAN', cadence: 'monthly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 0 },
  { column: 'Median Weeks Unemployeed', seriesId: 'UEMPMED', cadence: 'monthly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 0 },
  { column: 'Job Openings', seriesId: 'JTSJOL', cadence: 'monthly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 2 },
  { column: 'Unemployed 27 weeks', seriesId: 'UEMP27OV', cadence: 'monthly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 0 },
  { column: 'Unemployeed Count', seriesId: 'UNEMPLOY', cadence: 'monthly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 0 },
  { column: 'Fed Rate', seriesId: 'FEDFUNDS', cadence: 'monthly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 0 },
  { column: '15 year mortgage', seriesId: 'MORTGAGE15US', cadence: 'weekly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 0 },
  { column: '30 year mortgage', seriesId: 'MORTGAGE30US', cadence: 'weekly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 0 },
  { column: 'S&P 500', seriesId: 'SP500', cadence: 'daily', aggregation: 'last', scale: 1, maxCarryForwardMonths: 0 },
  { column: 'Labor Participation Rate', seriesId: 'CIVPART', cadence: 'monthly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 0 },
  { column: 'Labor Participation Core', seriesId: 'LNS11300060', cadence: 'monthly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 0 },
  { column: 'Housing Price Index', seriesId: 'CSUSHPINSA', cadence: 'monthly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 2 },
  { column: 'CPI', seriesId: 'CPIAUCSL', cadence: 'monthly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 0 },
  { column: 'GDP', seriesId: 'GDP', cadence: 'quarterly', aggregation: 'last', scale: 1, maxCarryForwardMonths: 2 },
  { column: STOCK_MARKET_COLUMN, seriesId: 'NCBCEL', cadence: 'quarterly', aggregation: 'last', scale: 0.001, maxCarryForwardMonths: 2 },
  { column: 'National Debt (b)', seriesId: 'GFDEBTN', cadence: 'quarterly', aggregation: 'last', scale: 0.001, maxCarryForwardMonths: 2 },
];

function getArg(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function parseObservedMonth(observedDate) {
  const [m, _d, y] = observedDate.split('/').map(Number);
  const fullYear = y < 100 ? 2000 + y : y;
  return `${fullYear}-${String(m).padStart(2, '0')}`;
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

function monthDiff(older, newer) {
  const start = parseMonthKey(older);
  const end = parseMonthKey(newer);
  return ((end.year - start.year) * 12) + (end.month - start.month);
}

function compareMonthKeys(a, b) {
  return a.localeCompare(b);
}

function lastCompleteMonthKey(now = new Date()) {
  return addMonths(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`, -1);
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

function parseCsvRow(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseFlexibleMonthKey(rawDate) {
  if (!rawDate) return null;
  const value = String(rawDate).trim();
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    if (month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    return null;
  }

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const yearRaw = Number(slashMatch[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    if (month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    return null;
  }

  return monthKeyFromDate(value);
}

function multiplierForUnits(rawUnits) {
  const units = String(rawUnits ?? 'billions').trim().toLowerCase();
  if (units === 'billions' || units === 'b') return 1;
  if (units === 'millions' || units === 'm') return 0.001;
  if (units === 'trillions' || units === 't') return 1000;
  if (units === 'raw') return 1;
  throw new Error(`Unsupported MARKET_CAP_MONTHLY_UNITS: ${rawUnits}`);
}

function pickColumnIndex(headers, explicitName, defaults) {
  if (explicitName) {
    const explicitIndex = headers.findIndex((h) => h.trim().toLowerCase() === explicitName.trim().toLowerCase());
    if (explicitIndex !== -1) return explicitIndex;
    throw new Error(`Could not find required column "${explicitName}" in monthly market-cap CSV.`);
  }

  for (const option of defaults) {
    const index = headers.findIndex((h) => h.trim().toLowerCase() === option);
    if (index !== -1) return index;
  }

  return -1;
}

async function loadMonthlyMarketCapMap() {
  const sourceUrl = process.env.MARKET_CAP_MONTHLY_CSV_URL;
  const sourcePath = process.env.MARKET_CAP_MONTHLY_CSV_PATH;
  if (!sourceUrl && !sourcePath) return null;

  let raw = '';
  if (sourceUrl) {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to load MARKET_CAP_MONTHLY_CSV_URL: HTTP ${response.status}`);
    }
    raw = await response.text();
  } else {
    raw = await readFile(path.resolve(process.cwd(), sourcePath), 'utf8');
  }

  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('Monthly market-cap CSV is empty or missing data rows.');
  }

  const headers = parseCsvRow(lines[0]);
  const dateIndex = pickColumnIndex(
    headers,
    process.env.MARKET_CAP_MONTHLY_DATE_COLUMN,
    ['date', 'month', 'observed date', 'period']
  );
  const valueIndex = pickColumnIndex(
    headers,
    process.env.MARKET_CAP_MONTHLY_VALUE_COLUMN,
    ['market_cap_b', 'market cap (b)', 'market cap', 'market_cap']
  );

  if (dateIndex === -1 || valueIndex === -1) {
    throw new Error('Monthly market-cap CSV must include date + value columns.');
  }

  const unitMultiplier = multiplierForUnits(process.env.MARKET_CAP_MONTHLY_UNITS);
  const monthly = new Map();

  for (const line of lines.slice(1)) {
    const row = parseCsvRow(line);
    const monthKey = parseFlexibleMonthKey(row[dateIndex]);
    const value = Number(row[valueIndex]);
    if (!monthKey || !Number.isFinite(value)) continue;
    monthly.set(monthKey, value * unitMultiplier);
  }

  if (!monthly.size) {
    throw new Error('Monthly market-cap CSV parsed, but no valid month/value rows were found.');
  }

  return monthly;
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
  let monthlyMarketCapMap = null;

  if (!fredApiKey) {
    console.error('Missing required env var: FRED_API_KEY');
    process.exit(1);
  }

  try {
    monthlyMarketCapMap = await loadMonthlyMarketCapMap();
  } catch (error) {
    console.warn(`Monthly market-cap source unavailable. Falling back to FRED NCBCEL. ${error instanceof Error ? error.message : String(error)}`);
  }

  const seriesRows = [];
  for (const config of SERIES_CONFIG) {
    if (config.column === STOCK_MARKET_COLUMN && monthlyMarketCapMap?.size) {
      const bounds = boundsFromMap(monthlyMarketCapMap);
      if (!bounds) {
        throw new Error('Monthly market-cap source is configured but has no usable values.');
      }

      seriesRows.push({ config, monthlyValues: monthlyMarketCapMap, bounds });
      console.log(`Loaded monthly market cap source -> ${bounds.first} to ${bounds.last}`);
      continue;
    }

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
  const latestAvailableMonth = seriesRows
    .map((s) => s.bounds.last)
    .sort(compareMonthKeys)
    .at(-1);

  if (!commonStart || !latestAvailableMonth) {
    throw new Error('Unable to compute source date range.');
  }

  const startMonth = startMonthOverride;
  const endMonth = [lastCompleteMonthKey(), latestAvailableMonth].sort(compareMonthKeys)[0];

  if (compareMonthKeys(startMonth, endMonth) > 0) {
    throw new Error(`Computed range is invalid: ${startMonth} > ${endMonth}`);
  }

  const months = getMonthRange(startMonth, endMonth);

  const filledSeries = seriesRows.map((series) => {
    const filled = new Map();
    let lastValue = null;
    let lastObservedMonth = null;

    for (const monthKey of months) {
      const current = series.monthlyValues.get(monthKey);
      if (Number.isFinite(current)) {
        lastValue = current;
        lastObservedMonth = monthKey;
        filled.set(monthKey, lastValue);
        continue;
      }

      if (lastValue !== null && lastObservedMonth !== null) {
        const carryForwardMonths = monthDiff(lastObservedMonth, monthKey);
        if (carryForwardMonths <= (series.config.maxCarryForwardMonths ?? 0)) {
          filled.set(monthKey, lastValue);
        }
      }
    }

    return { ...series, filled };
  });

  const headers = ['Observed Date', ...SERIES_CONFIG.map((s) => s.column)];
  const lines = [headers.join(',')];

  for (const monthKey of months) {
    const row = { 'Observed Date': formatObservedDate(monthKey) };

    for (const series of filledSeries) {
      const value = series.filled.get(monthKey);
      if (Number.isFinite(value)) {
        row[series.config.column] = sanitizeNumeric(value * (series.config.scale ?? 1));
        continue;
      }
      row[series.config.column] = '';
    }

    const csvLine = headers.map((header) => csvEscape(row[header] ?? '')).join(',');
    lines.push(csvLine);
  }

  const csvContent = `${lines.join('\n')}\n`;
  if (dryRun) {
    console.log(`Dry run complete: ${lines.length - 1} rows (${startMonth} -> ${endMonth}).`);
    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, csvContent, 'utf8');
  console.log(`Wrote ${lines.length - 1} rows to ${outputPath}`);
  console.log(`Coverage: ${startMonth} -> ${endMonth}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
