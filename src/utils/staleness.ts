// Shared staleness rule for the pipeline status snapshot (risk R1a).
// Mirrors scripts/check-data-freshness.mjs: a PASS older than this window is
// evidence the refresh pipeline stopped running, not evidence of health.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const STALE_AFTER_DAYS = 4;

export function isStatusStale(generatedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!generatedAt) return true;
  const generated = new Date(generatedAt);
  if (Number.isNaN(generated.getTime())) return true;
  return now.getTime() - generated.getTime() > STALE_AFTER_DAYS * MS_PER_DAY;
}
