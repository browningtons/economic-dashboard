#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const STOCK_MARKET_COLUMN = 'Stock Market (b)';

const SERIES_CONFIG = [
  { column: 'Unemployment Rate', seriesId: 'UNRATE', cadence: 'monthly', scale: 1, threshold: 0.15, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 0, maxValue: 40, maxMoMPct: 80, releaseLagMinMonths: 1, releaseLagMaxMonths: 2 },
  { column: 'Avg Weeks Unemployeed', seriesId: 'UEMPMEAN', cadence: 'monthly', scale: 1, threshold: 1.5, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 0, maxValue: 80, maxMoMPct: 80, releaseLagMinMonths: 1, releaseLagMaxMonths: 2 },
  { column: 'Job Openings', seriesId: 'JTSJOL', cadence: 'monthly', scale: 1, threshold: 350, maxLagMonths: 2, maxForwardFillMonths: 2, minValue: 1000, maxValue: 25000, maxMoMPct: 35, releaseLagMinMonths: 2, releaseLagMaxMonths: 3 },
  { column: 'Unemployed 27 weeks', seriesId: 'UEMP27OV', cadence: 'monthly', scale: 1, threshold: 300, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 100, maxValue: 10000, maxMoMPct: 70, releaseLagMinMonths: 1, releaseLagMaxMonths: 2 },
  { column: 'Unemployeed Count', seriesId: 'UNEMPLOY', cadence: 'monthly', scale: 1, threshold: 400, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 500, maxValue: 35000, maxMoMPct: 60, releaseLagMinMonths: 1, releaseLagMaxMonths: 2 },
  { column: 'Fed Rate', seriesId: 'FEDFUNDS', cadence: 'monthly', scale: 1, threshold: 0.2, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 0, maxValue: 25, maxMoMPct: 250, releaseLagMinMonths: 0, releaseLagMaxMonths: 2 },
  { column: '15 year mortgage', seriesId: 'MORTGAGE15US', cadence: 'weekly', scale: 1, threshold: 0.15, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 0, maxValue: 20, maxMoMPct: 35, releaseLagMinMonths: 0, releaseLagMaxMonths: 1 },
  { column: '30 year mortgage', seriesId: 'MORTGAGE30US', cadence: 'weekly', scale: 1, threshold: 0.15, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 0, maxValue: 20, maxMoMPct: 35, releaseLagMinMonths: 0, releaseLagMaxMonths: 1 },
  { column: 'S&P 500', seriesId: 'SP500', cadence: 'daily', scale: 1, threshold: 125, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 100, maxValue: 15000, maxMoMPct: 35, releaseLagMinMonths: 0, releaseLagMaxMonths: 1 },
  { column: 'Labor Participation Rate', seriesId: 'CIVPART', cadence: 'monthly', scale: 1, threshold: 0.2, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 40, maxValue: 80, maxMoMPct: 10, releaseLagMinMonths: 1, releaseLagMaxMonths: 2 },
  { column: 'Housing Price Index', seriesId: 'CSUSHPINSA', cadence: 'monthly', scale: 1, threshold: 1.0, maxLagMonths: 2, maxForwardFillMonths: 2, minValue: 50, maxValue: 500, maxMoMPct: 10, releaseLagMinMonths: 2, releaseLagMaxMonths: 4 },
  { column: 'CPI', seriesId: 'CPIAUCSL', cadence: 'monthly', scale: 1, threshold: 1.0, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 50, maxValue: 500, maxMoMPct: 5, releaseLagMinMonths: 1, releaseLagMaxMonths: 2 },
  { column: 'GDP', seriesId: 'GDP', cadence: 'quarterly', scale: 1, threshold: 10, maxLagMonths: 3, maxForwardFillMonths: 2, minValue: 1000, maxValue: 100000, maxMoMPct: 20, releaseLagMinMonths: 2, releaseLagMaxMonths: 4 },
  { column: STOCK_MARKET_COLUMN, seriesId: 'NCBCEL', cadence: 'quarterly', scale: 0.001, threshold: 2500, maxLagMonths: 3, maxForwardFillMonths: 2, minValue: 2000, maxValue: 250000, maxMoMPct: 60, releaseLagMinMonths: 1, releaseLagMaxMonths: 3, releaseWindowSeverity: 'warn' },
  { column: 'National Debt (b)', seriesId: 'GFDEBTN', cadence: 'quarterly', scale: 0.001, threshold: 400, maxLagMonths: 3, maxForwardFillMonths: 2, minValue: 1000, maxValue: 100000, maxMoMPct: 10, releaseLagMinMonths: 3, releaseLagMaxMonths: 5 },
  { column: '10Y Treasury', seriesId: 'DGS10', cadence: 'daily', scale: 1, threshold: 0.15, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 0, maxValue: 20, maxMoMPct: 40, releaseLagMinMonths: 0, releaseLagMaxMonths: 1 },
  { column: '2Y Treasury', seriesId: 'DGS2', cadence: 'daily', scale: 1, threshold: 0.15, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 0, maxValue: 20, maxMoMPct: 50, releaseLagMinMonths: 0, releaseLagMaxMonths: 1 },
  { column: 'Consumer Sentiment', seriesId: 'UMCSENT', cadence: 'monthly', scale: 1, threshold: 5, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 20, maxValue: 120, maxMoMPct: 25, releaseLagMinMonths: 1, releaseLagMaxMonths: 2 },
  { column: 'Retail Sales', seriesId: 'RSAFS', cadence: 'monthly', scale: 1, threshold: 15000, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 100000, maxValue: 1000000, maxMoMPct: 15, releaseLagMinMonths: 1, releaseLagMaxMonths: 2 },
  { column: 'Personal Savings Rate', seriesId: 'PSAVERT', cadence: 'monthly', scale: 1, threshold: 2, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: -5, maxValue: 40, maxMoMPct: 80, releaseLagMinMonths: 1, releaseLagMaxMonths: 3 },
  { column: 'PCE Price Index', seriesId: 'PCEPI', cadence: 'monthly', scale: 1, threshold: 1.0, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 50, maxValue: 500, maxMoMPct: 5, releaseLagMinMonths: 1, releaseLagMaxMonths: 3 },
  { column: 'Avg Hourly Earnings', seriesId: 'CES0500000003', cadence: 'monthly', scale: 1, threshold: 0.3, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 5, maxValue: 60, maxMoMPct: 8, releaseLagMinMonths: 1, releaseLagMaxMonths: 2 },
  { column: 'Initial Claims', seriesId: 'ICSA', cadence: 'weekly', scale: 1, threshold: 30000, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 100000, maxValue: 800000, maxMoMPct: 80, releaseLagMinMonths: 0, releaseLagMaxMonths: 1 },
  { column: 'Housing Starts', seriesId: 'HOUST', cadence: 'monthly', scale: 1, threshold: 100, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 400, maxValue: 3000, maxMoMPct: 30, releaseLagMinMonths: 1, releaseLagMaxMonths: 3 },
  { column: 'Building Permits', seriesId: 'PERMIT', cadence: 'monthly', scale: 1, threshold: 100, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 400, maxValue: 3000, maxMoMPct: 30, releaseLagMinMonths: 1, releaseLagMaxMonths: 3 },
  { column: 'Existing Home Sales', seriesId: 'EXHOSLUSM495S', cadence: 'monthly', scale: 1, threshold: 200000, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 2000000, maxValue: 8000000, maxMoMPct: 30, releaseLagMinMonths: 1, releaseLagMaxMonths: 3 },
  { column: 'Industrial Production', seriesId: 'INDPRO', cadence: 'monthly', scale: 1, threshold: 1.5, maxLagMonths: 2, maxForwardFillMonths: 0, minValue: 30, maxValue: 200, maxMoMPct: 15, releaseLagMinMonths: 1, releaseLagMaxMonths: 2 },
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

function parseCsvNumber(raw) {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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

function currentMonthKey(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function expectedReleaseWindow(config, nowMonthKey) {
  const minLag = config.releaseLagMinMonths ?? 0;
  const maxLag = config.releaseLagMaxMonths ?? minLag;
  return {
    earliestExpected: addMonths(nowMonthKey, -maxLag),
    latestExpected: addMonths(nowMonthKey, -minLag),
    minLag,
    maxLag,
  };
}

function getNextAutoRefreshUtc(fromDate) {
  const next = new Date(fromDate);
  next.setUTCSeconds(0, 0);
  next.setUTCHours(13, 15, 0, 0);

  if (next <= fromDate) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  while (next.getUTCDay() === 0 || next.getUTCDay() === 6) {
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(13, 15, 0, 0);
  }

  return next;
}

function getRecentMonths(monthKeys, count) {
  return [...monthKeys].sort(compareMonthKeys).slice(-count);
}

function getRecentSeries(entries, count, includeLead = 0) {
  if (!Number.isFinite(count) || count <= 0) return entries;
  return entries.slice(-(count + includeLead));
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPositiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function fetchSeries(seriesId, apiKey, observationStart) {
  const retries = getPositiveIntegerEnv('FRED_FETCH_RETRIES', 4);
  const retryDelayMs = getPositiveIntegerEnv('FRED_FETCH_RETRY_DELAY_MS', 2000);
  const query = new URLSearchParams({
    series_id: seriesId,
    file_type: 'json',
    observation_start: observationStart,
    sort_order: 'asc',
  });
  query.set('api_key', apiKey);
  const url = `https://api.stlouisfed.org/fred/series/observations?${query.toString()}`;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const payload = await response.json();
        if (!Array.isArray(payload?.observations)) {
          throw new Error(`${seriesId}: unexpected API response`);
        }
        return payload.observations;
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < retries) {
        const delay = attempt * retryDelayMs;
        console.warn(`FRED ${seriesId}: HTTP ${response.status} (attempt ${attempt}/${retries}), retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      const error = new Error(`${seriesId}: HTTP ${response.status} ${response.statusText}`.trim());
      error.retryable = false;
      throw error;
    } catch (error) {
      if (error?.retryable === false) throw error;

      if (attempt < retries) {
        const delay = attempt * retryDelayMs;
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`FRED ${seriesId}: ${message} (attempt ${attempt}/${retries}), retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw new Error(`${seriesId}: request failed after ${retries} attempts`);
}

async function main() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.error('Missing FRED_API_KEY');
    process.exit(1);
  }

  const csvPath = path.resolve(process.cwd(), 'public/data/economic_indicators.csv');
  const reportPath = path.resolve(process.cwd(), 'reports/data-validation-latest.md');
  const statusReportPath = path.resolve(process.cwd(), 'reports/data-status-latest.json');
  const publicStatusPath = path.resolve(process.cwd(), 'public/data/data_status.json');
  const observationStart = process.env.VALIDATE_OBSERVATION_START || '2024-01-01';
  const compareMonths = Number(process.env.VALIDATE_MONTH_WINDOW || 6);
  let monthlyMarketCapMap = null;

  try {
    monthlyMarketCapMap = await loadMonthlyMarketCapMap();
  } catch (error) {
    console.warn(`Monthly market-cap source unavailable during validation. Falling back to FRED NCBCEL. ${error instanceof Error ? error.message : String(error)}`);
  }

  const raw = await readFile(csvPath, 'utf8');
  const lines = raw.trim().split(/\r?\n/);
  const headers = parseCsvRow(lines[0]);
  const rows = lines.slice(1).map((line) => parseCsvRow(line));
  const rowByMonth = new Map();
  for (const row of rows) rowByMonth.set(parseObservedMonth(row[0]), row);
  const csvMonths = [...rowByMonth.keys()].sort(compareMonthKeys);

  const failures = [];
  const warnings = [];
  const summaries = [];
  const mismatchRows = [];
  const rangeBreaches = [];
  const momentumBreaches = [];
  const buffettBreaches = [];
  const releaseWindowBreaches = [];
  const nowMonthKey = currentMonthKey();

  for (const config of SERIES_CONFIG) {
    const colIndex = headers.indexOf(config.column);
    if (colIndex === -1) {
      failures.push(`${config.column}: column missing in CSV`);
      continue;
    }

    let csvLatest = null;
    for (const [month, row] of [...rowByMonth.entries()].sort((a, b) => compareMonthKeys(a[0], b[0]))) {
      const value = parseCsvNumber(row[colIndex]);
      if (value !== null) csvLatest = month;
    }

    let sourceMonthly = null;
    let sourceLabel = `FRED:${config.seriesId}`;

    try {
      if (config.column === STOCK_MARKET_COLUMN && monthlyMarketCapMap?.size) {
        sourceMonthly = monthlyMarketCapMap;
        sourceLabel = 'MONTHLY_CSV:MARKET_CAP';
      } else {
        const observations = await fetchSeries(config.seriesId, apiKey, observationStart);
        sourceMonthly = aggregateToMonthly(observations);
        if (config.cadence === 'quarterly') sourceMonthly = expandQuarterlyMonths(sourceMonthly);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${config.column}: unable to fetch validation source (${message})`);
      summaries.push({
        column: config.column,
        seriesId: sourceLabel,
        status: 'FAIL',
        csvLatest: csvLatest ?? 'n/a',
        sourceLatest: 'unavailable',
        lag: 'n/a',
        forwardFill: 'n/a',
        threshold: config.threshold,
        maxAbsDiff: 'n/a',
        mismatchCount: 'n/a',
        expectedReleaseWindow: 'n/a',
        releaseWindowStatus: 'SOURCE_UNAVAILABLE',
        releaseWindowGapMonths: 'n/a',
      });
      continue;
    }

    const sourceMonths = [...sourceMonthly.keys()].sort(compareMonthKeys);
    const sourceLatest = sourceMonths.at(-1);

    let lag = null;
    let forwardFill = 0;
    if (csvLatest && sourceLatest) {
      lag = Math.max(0, monthDiff(csvLatest, sourceLatest));
      forwardFill = Math.max(0, monthDiff(sourceLatest, csvLatest));
    }
    const releaseWindow = expectedReleaseWindow(config, nowMonthKey);
    const releaseWindowGapMonths = csvLatest && compareMonthKeys(csvLatest, releaseWindow.earliestExpected) < 0
      ? monthDiff(csvLatest, releaseWindow.earliestExpected)
      : 0;

    const overlapMonths = getRecentMonths(
      sourceMonths.filter((m) => rowByMonth.has(m)),
      compareMonths
    );

    let mismatchCount = 0;
    let maxAbsDiff = 0;
    for (const month of overlapMonths) {
      const sourceValue = Number(sourceMonthly.get(month)) * (config.scale ?? 1);
      const csvValue = parseCsvNumber(rowByMonth.get(month)[colIndex]);
      if (!Number.isFinite(sourceValue) || csvValue === null) continue;

      const absDiff = Math.abs(sourceValue - csvValue);
      maxAbsDiff = Math.max(maxAbsDiff, absDiff);
      if (absDiff > config.threshold) {
        mismatchCount += 1;
        mismatchRows.push({
          column: config.column,
          seriesId: sourceLabel,
          month,
          sourceValue,
          csvValue,
          absDiff,
          threshold: config.threshold,
        });
      }
    }

    const csvSeries = [...rowByMonth.entries()]
      .sort((a, b) => compareMonthKeys(a[0], b[0]))
      .map(([month, row]) => ({ month, value: parseCsvNumber(row[colIndex]) }))
      .filter((entry) => entry.value !== null);
    const recentValueSeries = getRecentSeries(csvSeries, compareMonths);
    const recentMomentumSeries = getRecentSeries(csvSeries, compareMonths, 1);

    let rangeBreachCount = 0;
    let momentumBreachCount = 0;

    if (config.minValue !== undefined || config.maxValue !== undefined) {
      for (const point of recentValueSeries) {
        const below = config.minValue !== undefined && point.value < config.minValue;
        const above = config.maxValue !== undefined && point.value > config.maxValue;
        if (!below && !above) continue;

        rangeBreachCount += 1;
        const boundary = below ? config.minValue : config.maxValue;
        rangeBreaches.push({
          column: config.column,
          month: point.month,
          value: point.value,
          boundary,
          direction: below ? 'below' : 'above',
          score: Math.abs(point.value - boundary),
        });
      }
    }

    if (config.maxMoMPct !== undefined) {
      for (let i = 1; i < recentMomentumSeries.length; i += 1) {
        const previous = recentMomentumSeries[i - 1];
        const current = recentMomentumSeries[i];
        if (!Number.isFinite(previous.value) || !Number.isFinite(current.value) || previous.value === 0) continue;

        const pctChange = Math.abs(((current.value - previous.value) / previous.value) * 100);
        if (pctChange <= config.maxMoMPct) continue;

        momentumBreachCount += 1;
        momentumBreaches.push({
          column: config.column,
          month: current.month,
          previousValue: previous.value,
          currentValue: current.value,
          pctChange,
          threshold: config.maxMoMPct,
          score: pctChange,
        });
      }
    }

    const lagFailed = lag !== null && lag > config.maxLagMonths;
    const forwardFillFailed = forwardFill > (config.maxForwardFillMonths ?? 0);
    const mismatchFailed = mismatchCount > 0;
    const rangeFailed = rangeBreachCount > 0;
    const momentumFailed = momentumBreachCount > 0;
    const releaseWindowFailed = !csvLatest || compareMonthKeys(csvLatest, releaseWindow.earliestExpected) < 0;
    const releaseWindowSeverity = config.releaseWindowSeverity === 'warn' ? 'WARN' : 'FAIL';
    const releaseWindowBlocks = releaseWindowFailed && releaseWindowSeverity !== 'WARN';
    const status = lagFailed || mismatchFailed || forwardFillFailed || rangeFailed || momentumFailed || releaseWindowBlocks
      ? 'FAIL'
      : releaseWindowFailed
        ? 'WARN'
        : 'PASS';

    if (lagFailed) {
      failures.push(`${config.column}: lag ${lag} months > ${config.maxLagMonths} months`);
    }
    if (mismatchFailed) {
      failures.push(`${config.column}: ${mismatchCount} threshold breaches (max abs diff ${maxAbsDiff.toFixed(4)})`);
    }
    if (forwardFillFailed) {
      failures.push(`${config.column}: forward-filled ${forwardFill} months beyond latest source (limit ${config.maxForwardFillMonths ?? 0})`);
    }
    if (rangeFailed) {
      failures.push(`${config.column}: ${rangeBreachCount} recent value(s) outside sanity bounds`);
    }
    if (momentumFailed) {
      failures.push(`${config.column}: ${momentumBreachCount} recent month-over-month change(s) exceeded ${config.maxMoMPct}%`);
    }
    if (releaseWindowFailed) {
      const message = `${config.column}: latest CSV month ${csvLatest ?? 'n/a'} is outside expected release window (${releaseWindow.earliestExpected} to ${releaseWindow.latestExpected})`;
      if (releaseWindowSeverity === 'WARN') {
        warnings.push(message);
      } else {
        failures.push(message);
      }
      releaseWindowBreaches.push({
        column: config.column,
        latestCsvMonth: csvLatest,
        expectedEarliest: releaseWindow.earliestExpected,
        expectedLatest: releaseWindow.latestExpected,
        lagMonthsBeyondWindow: releaseWindowGapMonths,
        severity: releaseWindowSeverity,
      });
    }

    summaries.push({
      column: config.column,
      seriesId: sourceLabel,
      status,
      csvLatest: csvLatest ?? 'n/a',
      sourceLatest: sourceLatest ?? 'n/a',
      lag: lag ?? 'n/a',
      forwardFill,
      threshold: config.threshold,
      maxAbsDiff: maxAbsDiff.toFixed(4),
      mismatchCount,
      expectedReleaseWindow: `${releaseWindow.earliestExpected}..${releaseWindow.latestExpected}`,
      releaseWindowStatus: releaseWindowFailed ? releaseWindowSeverity : 'PASS',
      releaseWindowGapMonths,
    });
  }

  const gdpIndex = headers.indexOf('GDP');
  const stockIndex = headers.indexOf(STOCK_MARKET_COLUMN);
  if (gdpIndex !== -1 && stockIndex !== -1) {
    for (const [month, row] of getRecentSeries([...rowByMonth.entries()].sort((a, b) => compareMonthKeys(a[0], b[0])), compareMonths)) {
      const gdp = parseCsvNumber(row[gdpIndex]);
      const stock = parseCsvNumber(row[stockIndex]);
      if (gdp === null || stock === null || gdp <= 0) continue;
      const ratio = (stock / gdp) * 100;
      if (ratio >= 20 && ratio <= 500) continue;

      buffettBreaches.push({
        column: 'Buffett Ratio',
        month,
        ratio,
        score: ratio < 20 ? 20 - ratio : ratio - 500,
      });
    }
  }

  if (buffettBreaches.length > 0) {
    failures.push(`Buffett Ratio: ${buffettBreaches.length} recent value(s) outside expected 20% to 500% range`);
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
    '| Column | Series | Status | CSV Latest | Source Latest | Expected Release Window | Release Window Status | Window Gap (months) | Source Lag (months) | Forward-Fill (months) | Threshold | Max Abs Diff | Breaches |',
    '|---|---|---|---:|---:|---|---|---:|---:|---:|---:|---:|---:|',
    ...summaries.map((s) => `| ${s.column} | ${s.seriesId} | ${s.status} | ${s.csvLatest} | ${s.sourceLatest} | ${s.expectedReleaseWindow} | ${s.releaseWindowStatus} | ${s.releaseWindowGapMonths} | ${s.lag} | ${s.forwardFill} | ${s.threshold} | ${s.maxAbsDiff} | ${s.mismatchCount} |`),
    '',
    '## Top Investigations',
    '',
  ];

  if (topInvestigations.length === 0) {
    reportLines.push('No threshold breaches detected in the current comparison window.');
  } else {
    reportLines.push('| Column | Series | Month | Source | CSV | Abs Diff | Threshold |');
    reportLines.push('|---|---|---:|---:|---:|---:|---:|');
    reportLines.push(...topInvestigations.map((r) => `| ${r.column} | ${r.seriesId} | ${r.month} | ${r.sourceValue.toFixed(4)} | ${r.csvValue.toFixed(4)} | ${r.absDiff.toFixed(4)} | ${r.threshold} |`));
  }

  const sanityRows = [
    ...rangeBreaches.map((item) => ({
      type: 'Range',
      column: item.column,
      month: item.month,
      details: `${item.value.toFixed(4)} (${item.direction} ${item.boundary.toFixed(4)})`,
      severity: item.score,
    })),
    ...momentumBreaches.map((item) => ({
      type: 'MoM Spike',
      column: item.column,
      month: item.month,
      details: `${item.pctChange.toFixed(2)}% (threshold ${item.threshold}%)`,
      severity: item.score,
    })),
    ...buffettBreaches.map((item) => ({
      type: 'Buffett Sanity',
      column: item.column,
      month: item.month,
      details: `${item.ratio.toFixed(2)}% (expected 20%-500%)`,
      severity: item.score,
    })),
  ]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 12);

  reportLines.push('', '## Sanity Check Alerts', '');
  if (sanityRows.length === 0) {
    reportLines.push('No sanity check alerts detected.');
  } else {
    reportLines.push('| Type | Column | Month | Details |');
    reportLines.push('|---|---|---:|---|');
    reportLines.push(...sanityRows.map((item) => `| ${item.type} | ${item.column} | ${item.month} | ${item.details} |`));
  }

  reportLines.push('', '## Release Calendar Alerts', '');
  if (releaseWindowBreaches.length === 0) {
    reportLines.push('No release calendar breaches detected.');
  } else {
    reportLines.push('| Column | Latest CSV Month | Expected Window | Gap (months) |');
    reportLines.push('|---|---:|---|---:|');
    reportLines.push(...releaseWindowBreaches.map((item) => `| ${item.column} | ${item.latestCsvMonth ?? 'n/a'} | ${item.expectedEarliest}..${item.expectedLatest} | ${item.lagMonthsBeyondWindow} |`));
  }

  const latestMonth = csvMonths.at(-1) ?? null;
  const latestRow = latestMonth ? rowByMonth.get(latestMonth) : null;
  const latestGdp = latestRow && gdpIndex !== -1 ? Number(latestRow[gdpIndex]) : null;
  const latestStock = latestRow && stockIndex !== -1 ? Number(latestRow[stockIndex]) : null;
  const latestBuffett = Number.isFinite(latestGdp) && Number.isFinite(latestStock) && latestGdp > 0
    ? (latestStock / latestGdp) * 100
    : null;

  const topAlerts = [
    ...topInvestigations.map((item) => ({
      type: 'Threshold',
      column: item.column,
      month: item.month,
      details: `Source ${item.sourceValue.toFixed(4)} vs CSV ${item.csvValue.toFixed(4)} (diff ${item.absDiff.toFixed(4)} > ${item.threshold})`,
      severity: item.absDiff,
    })),
    ...sanityRows.map((item) => ({
      type: item.type,
      column: item.column,
      month: item.month,
      details: item.details,
      severity: item.severity,
    })),
    ...releaseWindowBreaches.map((item) => ({
      type: 'Release Calendar',
      column: item.column,
      month: item.latestCsvMonth ?? 'n/a',
      details: `${item.severity === 'WARN' ? 'Warning' : 'Expected'} ${item.expectedEarliest}..${item.expectedLatest}, got ${item.latestCsvMonth ?? 'n/a'}`,
      severity: Math.max(1, item.lagMonthsBeyondWindow),
    })),
  ]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 10)
    .map(({ severity, ...rest }) => rest);

  const statusPayload = {
    generatedAt: new Date().toISOString(),
    evaluatedMonth: nowMonthKey,
    nextScheduledRefreshUtc: getNextAutoRefreshUtc(new Date()).toISOString(),
    status: failures.length > 0 ? 'FAIL' : 'PASS',
    failureCount: failures.length,
    warningCount: warnings.length,
    failedSeriesCount: summaries.filter((item) => item.status === 'FAIL').length,
    totalSeriesCount: summaries.length,
    latestDataMonth: latestMonth,
    latestBuffettRatio: latestBuffett !== null ? Number(latestBuffett.toFixed(4)) : null,
    failures,
    warnings,
    topAlerts,
    releaseCalendarBreaches: releaseWindowBreaches,
    series: summaries,
  };

  if (warnings.length > 0) {
    reportLines.push('', '## Warnings', '', ...warnings.map((warning) => `- ${warning}`));
  }

  if (failures.length > 0) {
    reportLines.push('', '## Failures', '', ...failures.map((f) => `- ${f}`));
  }

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${reportLines.join('\n')}\n`, 'utf8');
  await mkdir(path.dirname(statusReportPath), { recursive: true });
  await writeFile(statusReportPath, `${JSON.stringify(statusPayload, null, 2)}\n`, 'utf8');
  await mkdir(path.dirname(publicStatusPath), { recursive: true });
  await writeFile(publicStatusPath, `${JSON.stringify(statusPayload, null, 2)}\n`, 'utf8');

  console.log(`Validation report written to ${reportPath}`);
  console.log(`Status report written to ${statusReportPath}`);
  console.log(`Public status written to ${publicStatusPath}`);
  if (failures.length > 0) {
    console.error(`Validation failed with ${failures.length} issue(s).`);
    process.exit(1);
  }

  console.log('Validation passed.');
}

// Pure helpers are exported for unit testing. main() only runs when this file
// is invoked directly as a script (not when imported by the test suite).
export {
  SERIES_CONFIG,
  STOCK_MARKET_COLUMN,
  monthKeyFromDate,
  parseObservedMonth,
  parseCsvRow,
  parseCsvNumber,
  addMonths,
  monthDiff,
  compareMonthKeys,
  currentMonthKey,
  expectedReleaseWindow,
  getRecentMonths,
  getRecentSeries,
  aggregateToMonthly,
  parseFlexibleMonthKey,
  multiplierForUnits,
  expandQuarterlyMonths,
  main,
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
