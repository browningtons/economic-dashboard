#!/usr/bin/env node

/**
 * One-time backfill: fetch historical S&P 500 monthly close prices from
 * Yahoo Finance and fill gaps in the existing CSV where the column is empty.
 *
 * FRED's SP500 series only begins 2013-02, so this covers 2000-01 through
 * whatever month is still missing.
 *
 * Usage:
 *   node scripts/backfill-sp500.mjs                # preview (dry-run)
 *   node scripts/backfill-sp500.mjs --apply        # write changes
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CSV_PATH = path.resolve(process.cwd(), 'public/data/economic_indicators.csv');
const SP500_COLUMN = 'S&P 500';

/* ── Yahoo Finance download ─────────────────────────────────────── */

async function fetchYahooMonthly(startDate, endDate) {
  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000);

  // Use the v8 chart API — doesn't require auth cookies
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1=${period1}&period2=${period2}&interval=1mo&includeAdjustedClose=true`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  if (!result) {
    throw new Error('Unexpected Yahoo Finance chart API response structure');
  }

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.adjclose?.[0]?.adjclose
    ?? result.indicators?.quote?.[0]?.close
    ?? [];

  const monthly = new Map();

  for (let i = 0; i < timestamps.length; i++) {
    const price = closes[i];
    if (!Number.isFinite(price)) continue;

    const date = new Date(timestamps[i] * 1000);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    monthly.set(monthKey, Math.round(price * 100) / 100);
  }

  return monthly;
}

/* ── CSV helpers ─────────────────────────────────────────────────── */

function parseCsvRow(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
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

function parseObservedMonth(dateStr) {
  const [m, _d, y] = dateStr.split('/').map(Number);
  const year = y < 100 ? 2000 + y : y;
  return `${year}-${String(m).padStart(2, '0')}`;
}

/* ── Main ───────────────────────────────────────────────────────── */

async function main() {
  const apply = process.argv.includes('--apply');

  console.log('Reading CSV...');
  const raw = await readFile(CSV_PATH, 'utf8');
  const lines = raw.trim().split(/\r?\n/);
  const headers = parseCsvRow(lines[0]);
  const sp500Idx = headers.indexOf(SP500_COLUMN);

  if (sp500Idx === -1) {
    throw new Error(`Column "${SP500_COLUMN}" not found in CSV headers`);
  }

  // Find months with missing S&P 500 data
  const missingMonths = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    const monthKey = parseObservedMonth(row[0]);
    const value = row[sp500Idx]?.trim();
    if (!value) {
      missingMonths.push({ lineIndex: i, monthKey, row });
    }
  }

  if (missingMonths.length === 0) {
    console.log('No missing S&P 500 months found. Nothing to do.');
    return;
  }

  const firstMissing = missingMonths[0].monthKey;
  const lastMissing = missingMonths[missingMonths.length - 1].monthKey;
  console.log(`Found ${missingMonths.length} months with missing S&P 500 data (${firstMissing} to ${lastMissing})`);

  // Fetch from Yahoo Finance
  console.log('Fetching S&P 500 history from Yahoo Finance...');
  const [startYear, startMonth] = firstMissing.split('-').map(Number);
  const [endYear, endMonth] = lastMissing.split('-').map(Number);
  const startDate = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const endDate = new Date(Date.UTC(endYear, endMonth, 1)); // one month past to ensure coverage

  const yahooData = await fetchYahooMonthly(startDate, endDate);
  console.log(`Yahoo Finance returned ${yahooData.size} monthly data points`);

  // Fill gaps
  let filled = 0;
  let skipped = 0;
  const updatedLines = [...lines];

  for (const { lineIndex, monthKey, row } of missingMonths) {
    const price = yahooData.get(monthKey);
    if (price === undefined) {
      skipped++;
      continue;
    }

    // Rebuild the CSV line with the filled value
    const updatedRow = [...row];
    // Pad if needed
    while (updatedRow.length <= sp500Idx) updatedRow.push('');
    updatedRow[sp500Idx] = String(price);
    updatedLines[lineIndex] = updatedRow.join(',');
    filled++;
    console.log(`  ${monthKey}: ${price}`);
  }

  console.log(`\nSummary: ${filled} months filled, ${skipped} months skipped (no Yahoo data)`);

  if (!apply) {
    console.log('\nDry run complete. Use --apply to write changes.');
    return;
  }

  await writeFile(CSV_PATH, updatedLines.join('\n') + '\n', 'utf8');
  console.log(`\nCSV updated: ${CSV_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
