#!/usr/bin/env node
// Post-deploy check: does the live CDN actually serve current data?
//
// `check-data-freshness.mjs` (R1a) verifies the *committed* snapshot's
// `generatedAt` against the wall clock — it catches a stopped refresh
// pipeline. It cannot catch a refresh that ran and committed fine but whose
// output never reached the CDN (a bad Pages deploy, a caching layer serving
// a stale artifact, a truncated upload) — a gap flagged by User Journey
// 2026-08-12 as "the same absence-shaped blind spot as R1a, one layer out."
//
// This fetches the deployed CSV itself and checks the last row's Observed
// Date against the wall clock. Exit 0 when fresh, exit 1 when missing,
// unreachable, empty, or stale.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DEFAULT_MAX_AGE_DAYS = 40;
export const DEFAULT_URL = 'https://browningtons.github.io/economic-dashboard/data/economic_indicators.csv';

function parseLastObservedDate(csvText) {
  const lines = csvText.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { error: `CSV has no data rows (${lines.length} line(s) total).` };
  }
  const lastLine = lines[lines.length - 1];
  const firstField = lastLine.split(',')[0]?.trim();
  if (!firstField) {
    return { error: `Last row has no Observed Date field: "${lastLine}"` };
  }
  const date = new Date(firstField);
  if (Number.isNaN(date.getTime())) {
    return { error: `Last row's Observed Date is not parseable: "${firstField}"` };
  }
  return { date };
}

export async function checkDeployedData(url = DEFAULT_URL, options = {}) {
  const maxAgeDays = options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
  const now = options.now ?? new Date();
  const fetchImpl = options.fetch ?? fetch;

  let response;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    return { ok: false, message: `Fetch failed for ${url}: ${error.message}` };
  }

  if (!response.ok) {
    return { ok: false, message: `Deployed CSV returned HTTP ${response.status}: ${url}` };
  }

  const text = await response.text();
  const parsed = parseLastObservedDate(text);
  if (parsed.error) {
    return { ok: false, message: `${parsed.error} (${url})` };
  }

  const ageDays = (now.getTime() - parsed.date.getTime()) / MS_PER_DAY;
  if (ageDays > maxAgeDays) {
    return {
      ok: false,
      ageDays,
      message: `Deployed CSV's last row is ${ageDays.toFixed(1)} days old (max ${maxAgeDays}): ${url}. The refresh pipeline may be running but not reaching the CDN — check the Pages deploy.`,
    };
  }

  return {
    ok: true,
    ageDays,
    message: `Deployed CSV is fresh: last row is ${ageDays.toFixed(1)} days old (max ${maxAgeDays}).`,
  };
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  const url = process.argv[2] ?? DEFAULT_URL;
  const maxAgeDays = process.env.MAX_DEPLOYED_DATA_AGE_DAYS
    ? Number(process.env.MAX_DEPLOYED_DATA_AGE_DAYS)
    : DEFAULT_MAX_AGE_DAYS;

  const result = await checkDeployedData(url, { maxAgeDays });
  if (result.ok) {
    console.log(result.message);
  } else {
    console.error(`::error::${result.message}`);
    process.exit(1);
  }
}
