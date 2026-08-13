// Which CSV actually reached the chart — and whether the pipeline's freshness
// claim describes it.
//
// `getCsvData()` tries three sources in order (opt-in Google Sheet, the
// deployed `public/data/economic_indicators.csv`, then a CSV literal compiled
// into the bundle) and silently succeeds on whichever answers first. The
// freshness label and the PASS badge, however, are read from a *separate*
// fetch of `data_status.json`. Those two requests can disagree: if the CSV
// fetch fails and the status fetch succeeds, the app renders the embedded
// snapshot under a genuinely-fresh `generatedAt` and a green PASS.
//
// That is the R1 trust hole ("a PASS badge over stale data") arriving through
// a different pipe, and `isStatusStale` cannot catch it — the status file
// really is fresh. Only the data under it is old. So freshness has to be
// attributed to the source that produced the rows on screen.

export type CsvSource = 'sheet' | 'local' | 'embedded';

/** True when the rows on screen came from the bundled literal, not a live fetch. */
export function isFallbackSource(source: CsvSource): boolean {
  return source === 'embedded';
}

/**
 * Whether `data_status.json`'s `generatedAt` describes the data being rendered.
 * False for the embedded snapshot: the status file is about the pipeline's
 * latest run, which never touched the literal compiled into this bundle.
 */
export function pipelineFreshnessAppliesTo(source: CsvSource): boolean {
  return !isFallbackSource(source);
}

/**
 * Banner copy for a fallback load, or null when the data is live.
 * `latestPointLabel` is the last observation actually present in the fallback
 * (e.g. "September 2025") so the gap is concrete rather than abstract.
 */
export function fallbackWarning(
  source: CsvSource,
  latestPointLabel?: string | null,
): string | null {
  if (!isFallbackSource(source)) return null;
  const through = latestPointLabel ? ` It ends at ${latestPointLabel}.` : '';
  return (
    'Live data could not be loaded — showing the snapshot bundled with this ' +
    `build.${through} Reload to try again.`
  );
}
