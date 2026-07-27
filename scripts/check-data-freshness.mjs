#!/usr/bin/env node
// Wall-clock freshness check for the published data snapshot (risk R1a).
//
// Runs OUTSIDE the refresh workflow: a refresh job that never fires produces
// no failed run and therefore no signal. This check keys on the age of
// public/data/data_status.json `generatedAt` against the wall clock, so any
// CI run (push, PR, or schedule) surfaces a pipeline that silently stopped.
//
// Exit 0 when fresh, exit 1 when stale/missing/unparseable.

import fs from 'node:fs';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DEFAULT_MAX_AGE_DAYS = 4;
export const DEFAULT_STATUS_PATH = 'public/data/data_status.json';

export function checkFreshness(statusPath = DEFAULT_STATUS_PATH, options = {}) {
  const maxAgeDays = options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
  const now = options.now ?? new Date();

  if (!fs.existsSync(statusPath)) {
    return { ok: false, message: `Status file not found: ${statusPath}` };
  }

  let status;
  try {
    status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  } catch (error) {
    return { ok: false, message: `Status file is not valid JSON: ${error.message}` };
  }

  const generatedAt = status?.generatedAt;
  if (!generatedAt) {
    return { ok: false, message: 'Status file has no generatedAt field.' };
  }

  const generated = new Date(generatedAt);
  if (Number.isNaN(generated.getTime())) {
    return { ok: false, message: `generatedAt is not a parseable date: ${generatedAt}` };
  }

  const ageDays = (now.getTime() - generated.getTime()) / MS_PER_DAY;
  if (ageDays > maxAgeDays) {
    return {
      ok: false,
      ageDays,
      message: `Data snapshot is stale: generatedAt ${generatedAt} is ${ageDays.toFixed(1)} days old (max ${maxAgeDays}). The refresh pipeline has likely stopped running — check the Update Economic Data workflow (disabled? cron not firing?).`,
    };
  }

  return {
    ok: true,
    ageDays,
    message: `Data snapshot is fresh: generatedAt ${generatedAt} (${ageDays.toFixed(1)} days old, max ${maxAgeDays}).`,
  };
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  const statusPath = process.argv[2] ?? DEFAULT_STATUS_PATH;
  const maxAgeDays = process.env.MAX_DATA_AGE_DAYS
    ? Number(process.env.MAX_DATA_AGE_DAYS)
    : DEFAULT_MAX_AGE_DAYS;

  const result = checkFreshness(statusPath, { maxAgeDays });
  if (result.ok) {
    console.log(result.message);
  } else {
    console.error(`::error::${result.message}`);
    process.exit(1);
  }
}
