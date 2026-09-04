import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Card from './Card';
import { BUILD_NOTES, BUILD_NOTES_TITLE, BUILD_VERSION, BUILD_VERSION_LABEL, BUILD_VERSION_SUMMARY } from '../buildNotes';
import type { Cadence, DataPoint, DataSourceInfo, MetricConfig, PipelineStatus } from '../types/dashboard';
import { STALE_AFTER_DAYS, isStatusStale } from '../utils/staleness';

interface MetricHealthRow {
  id: string;
  label: string;
  source?: DataSourceInfo;
  cadence: Cadence;
  firstValueDate: Date | null;
  lastValueDate: Date | null;
  expectedNextDate: Date | null;
  countdownText: string;
  isOverdue: boolean;
  isFresh: boolean;
  missingCount: number;
  missingRecentCount: number;
  expectedCells: number;
  completenessPct: string;
}

interface DataTableViewProps {
  data: DataPoint[];
  metrics: MetricConfig[];
  metricSources: Record<string, DataSourceInfo>;
  now: Date;
  pipelineStatus?: PipelineStatus | null;
  /**
   * False when `data` came from the bundled fallback snapshot rather than a
   * live fetch (see `pipelineFreshnessAppliesTo` in `utils/dataSource.ts`).
   * `pipelineStatus` describes the pipeline's last run against the deployed
   * CSV, which never touched the embedded literal — so its PASS/FAIL/stale
   * verdict must not be presented as describing the rows on screen.
   */
  pipelineStatusApplies: boolean;
}

const ROW_HEIGHT = 36;
const ROW_OVERSCAN = 8;

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function addCadenceWindow(date: Date, cadence: Cadence) {
  const next = new Date(date);
  if (cadence === 'daily') {
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (cadence === 'weekly') {
    next.setDate(next.getDate() + 7);
    return next;
  }
  if (cadence === 'quarterly') {
    next.setMonth(next.getMonth() + 3);
    return next;
  }
  next.setMonth(next.getMonth() + 1);
  return next;
}

function formatCountdownStatus(targetDate: Date, now: Date) {
  const deltaMs = targetDate.getTime() - now.getTime();
  if (deltaMs >= 0) return `Due in ${formatDuration(deltaMs)}`;
  return `Overdue by ${formatDuration(Math.abs(deltaMs))}`;
}

function csvEscape(value: string | number | undefined) {
  if (value === undefined || value === null) return '';
  const raw = String(value);
  if (!/[",\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

const DataTableView = React.memo(function DataTableView({ data, metrics, metricSources, now, pipelineStatus, pipelineStatusApplies }: DataTableViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [visibleMetricIds, setVisibleMetricIds] = useState<string[]>(() => {
    const seen = new Set<string>();
    return metrics.filter((metric) => {
      if (seen.has(metric.id)) return false;
      seen.add(metric.id);
      return true;
    }).map((metric) => metric.id);
  });

  const tableScrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(620);

  const tableMetrics = useMemo(() => {
    const seen = new Set<string>();
    return metrics.filter((metric) => {
      if (seen.has(metric.id)) return false;
      seen.add(metric.id);
      return true;
    });
  }, [metrics]);

  useEffect(() => {
    setVisibleMetricIds((current) => {
      const availableIds = new Set(tableMetrics.map((metric) => metric.id));
      const kept = current.filter((id) => availableIds.has(id));
      if (kept.length > 0) return kept;
      return tableMetrics.map((metric) => metric.id);
    });
  }, [tableMetrics]);

  const visibleMetrics = useMemo(() => {
    const idSet = new Set(visibleMetricIds);
    return tableMetrics.filter((metric) => idSet.has(metric.id));
  }, [tableMetrics, visibleMetricIds]);

  const metricHealthRows = useMemo<MetricHealthRow[]>(() => {
    const recentWindowStart = Math.max(0, data.length - 12);

    const rows = tableMetrics.map((metric) => {
      const source = metricSources[metric.id];
      const cadence = source?.cadence ?? 'monthly';
      let missingCount = 0;
      let missingRecentCount = 0;
      let firstTimestamp: number | null = null;
      let lastTimestamp: number | null = null;
      let firstIndex = -1;

      data.forEach((point, index) => {
        const value = Number(point[metric.id]);
        const hasValue = Number.isFinite(value);

        if (hasValue) {
          if (firstTimestamp === null) {
            firstTimestamp = Number(point.timestamp);
            firstIndex = index;
          }
          lastTimestamp = Number(point.timestamp);
          return;
        }

        // Only count as missing if after the series started
        if (firstTimestamp !== null) {
          missingCount += 1;
        }
        if (index >= recentWindowStart && firstTimestamp !== null) missingRecentCount += 1;
      });

      const firstValueDate = firstTimestamp ? new Date(firstTimestamp) : null;
      const lastValueDate = lastTimestamp ? new Date(lastTimestamp) : null;
      const expectedNextDate = lastValueDate ? addCadenceWindow(lastValueDate, cadence) : null;
      const isOverdue = expectedNextDate ? expectedNextDate.getTime() < now.getTime() : false;

      // Expected cells = rows from first observation to end of data
      const expectedCells = firstIndex >= 0 ? data.length - firstIndex : 0;
      const actualCells = expectedCells - missingCount;

      // Fresh = not overdue based on its cadence (next expected update is still in the future)
      const isFresh = !isOverdue && lastValueDate !== null;

      return {
        id: metric.id,
        label: metric.label,
        source,
        cadence,
        firstValueDate,
        lastValueDate,
        expectedNextDate,
        countdownText: expectedNextDate ? formatCountdownStatus(expectedNextDate, now) : 'No observations',
        isOverdue,
        isFresh,
        missingCount,
        missingRecentCount,
        expectedCells,
        completenessPct: expectedCells > 0 ? ((actualCells / expectedCells) * 100).toFixed(1) : '0.0',
      };
    });

    // Sort: fresh first (by most recent), then overdue, then alphabetical
    return rows.sort((a, b) => {
      // Fresh metrics first, sorted by most recent data
      if (a.isFresh !== b.isFresh) return a.isFresh ? -1 : 1;
      // Within same freshness group, sort by last value date (newest first)
      if (a.lastValueDate && b.lastValueDate) {
        const timeDiff = b.lastValueDate.getTime() - a.lastValueDate.getTime();
        if (timeDiff !== 0) return timeDiff;
      }
      return a.label.localeCompare(b.label);
    });
  }, [data, metricSources, now, tableMetrics]);

  const datasetLastUpdateDate = useMemo(() => {
    if (!data.length) return null;
    return new Date(data[data.length - 1].timestamp);
  }, [data]);

  const datasetExpectedNextDate = useMemo(() => {
    if (!datasetLastUpdateDate) return null;
    return addCadenceWindow(datasetLastUpdateDate, 'monthly');
  }, [datasetLastUpdateDate]);

  const datasetCountdownText = useMemo(() => {
    if (!datasetExpectedNextDate) return 'No schedule';
    return formatCountdownStatus(datasetExpectedNextDate, now);
  }, [datasetExpectedNextDate, now]);

  const datasetMissingCells = useMemo(
    () => metricHealthRows.reduce((sum, row) => sum + row.missingCount, 0),
    [metricHealthRows]
  );

  const totalExpectedCells = useMemo(
    () => metricHealthRows.reduce((sum, row) => sum + row.expectedCells, 0),
    [metricHealthRows]
  );

  const overdueMetricCount = useMemo(
    () => metricHealthRows.filter((row) => row.isOverdue).length,
    [metricHealthRows]
  );

  const freshnessScore = useMemo(() => {
    if (metricHealthRows.length === 0) return 0;
    const freshCount = metricHealthRows.filter((row) => row.isFresh).length;
    return Math.round((freshCount / metricHealthRows.length) * 100);
  }, [metricHealthRows]);

  const lowestCompleteness = useMemo(() => {
    if (metricHealthRows.length === 0) return null;
    return metricHealthRows.reduce((min, row) => parseFloat(row.completenessPct) < parseFloat(min.completenessPct) ? row : min);
  }, [metricHealthRows]);

  const currentMonthStr = useMemo(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [now]);

  const dataHealthCounts = useMemo(() => {
    const counts = {
      fresh: 0,
      carryForward: 0,
      needsAttention: 0,
      unknown: 0,
    };

    if (!pipelineStatusApplies || !pipelineStatus?.series?.length) {
      counts.unknown = metrics.length;
      return counts;
    }

    pipelineStatus.series.forEach((series) => {
      const seriesStatus = String(series.status ?? '').toUpperCase();
      const releaseStatus = String(series.releaseWindowStatus ?? '').toUpperCase();
      const hasReleaseGap = (series.releaseWindowGapMonths ?? 0) > 0;

      if (seriesStatus === 'FAIL' || releaseStatus === 'FAIL' || hasReleaseGap) {
        counts.needsAttention += 1;
      } else if ((series.forwardFill ?? 0) > 0) {
        counts.carryForward += 1;
      } else if (seriesStatus === 'PASS' && releaseStatus === 'PASS') {
        counts.fresh += 1;
      } else {
        counts.unknown += 1;
      }
    });

    return counts;
  }, [metrics.length, pipelineStatus, pipelineStatusApplies]);

  // R1a: a PASS only counts as healthy while it is recent. A refresh pipeline
  // that stops running leaves the last PASS frozen in place — treat that as
  // unhealthy rather than rendering it green.
  const statusIsStale = pipelineStatusApplies && pipelineStatus != null && isStatusStale(pipelineStatus.generatedAt, now);

  // R6 (2026-08-12): `pipelineStatus` reports on the deployed CSV's last
  // pipeline run, which never touched the bundled fallback snapshot. On the
  // fallback, presenting its PASS/FAIL/stale verdict as describing the rows
  // on screen is the same trust hole the header fix closed, one view over.
  const pipelineHealthText = !pipelineStatusApplies
    ? 'Not applicable — showing the snapshot bundled with this build, not the pipeline\'s output.'
    : pipelineStatus?.status === 'FAIL'
      ? `${pipelineStatus.failedSeriesCount ?? 0} of ${pipelineStatus.totalSeriesCount ?? metrics.length} data sources have issues`
      : pipelineStatus?.status === 'PASS'
        ? statusIsStale
          ? `Last successful refresh is more than ${STALE_AFTER_DAYS} days old — the data pipeline may have stopped running`
          : 'All data sources are up to date'
        : 'Pipeline status unavailable';

  const validationSummary = !pipelineStatusApplies
    ? 'Not applicable to the bundled snapshot.'
    : pipelineStatus?.status === 'PASS'
      ? statusIsStale
        ? 'Latest validation passed, but the result is stale.'
        : 'Latest validation passed.'
      : pipelineStatus?.status === 'FAIL'
        ? `${pipelineStatus.failureCount ?? 0} validation issue${(pipelineStatus.failureCount ?? 0) === 1 ? '' : 's'} detected.`
        : 'Validation status unavailable.';

  const lastCheckedText = pipelineStatusApplies && pipelineStatus?.generatedAt
    ? new Date(pipelineStatus.generatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  const trackedSeriesCount = pipelineStatus?.totalSeriesCount ?? pipelineStatus?.series?.length ?? metrics.length;

  const years = useMemo(() => {
    const uniques = new Set<number>();
    data.forEach((point) => uniques.add(new Date(point.timestamp).getFullYear()));
    return [...uniques].sort((a, b) => b - a);
  }, [data]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return [...data]
      .reverse()
      .filter((row) => {
        if (yearFilter !== 'ALL' && new Date(row.timestamp).getFullYear() !== Number(yearFilter)) {
          return false;
        }

        if (showMissingOnly) {
          const hasMissing = visibleMetrics.some((metric) => !Number.isFinite(Number(row[metric.id])));
          if (!hasMissing) return false;
        }

        if (!q) return true;

        const dateValue = new Date(row.timestamp).toLocaleDateString().toLowerCase();
        if (dateValue.includes(q)) return true;

        return visibleMetrics.some((metric) => {
          if (metric.label.toLowerCase().includes(q)) return true;
          const rawValue = Number(row[metric.id]);
          if (!Number.isFinite(rawValue)) return false;
          const rawText = String(rawValue).toLowerCase();
          const formatted = metric.format(rawValue).toLowerCase();
          return rawText.includes(q) || formatted.includes(q);
        });
      });
  }, [data, searchTerm, showMissingOnly, visibleMetrics, yearFilter]);

  const totalRows = filteredRows.length;
  const visibleCount = Math.max(1, Math.ceil(scrollHeight / ROW_HEIGHT) + ROW_OVERSCAN * 2);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - ROW_OVERSCAN);
  const endIndex = Math.min(totalRows, startIndex + visibleCount);
  const windowedRows = filteredRows.slice(startIndex, endIndex);
  const topPad = startIndex * ROW_HEIGHT;
  const bottomPad = Math.max(0, (totalRows - endIndex) * ROW_HEIGHT);

  useEffect(() => {
    const element = tableScrollerRef.current;
    if (!element) return;

    const measure = () => setScrollHeight(element.clientHeight || 620);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = tableScrollerRef.current;
    if (!element) return;
    element.scrollTop = 0;
    setScrollTop(0);
  }, [searchTerm, showMissingOnly, yearFilter, visibleMetricIds]);

  const toggleMetricColumn = useCallback((metricId: string) => {
    setVisibleMetricIds((current) => {
      if (current.includes(metricId)) {
        if (current.length === 1) return current;
        return current.filter((id) => id !== metricId);
      }
      return [...current, metricId];
    });
  }, []);

  const setAllColumns = useCallback(() => {
    setVisibleMetricIds(tableMetrics.map((metric) => metric.id));
  }, [tableMetrics]);

  const handleExportCsv = useCallback(() => {
    const headers = ['Observed Date', ...visibleMetrics.map((metric) => metric.id)];
    const lines = [headers.join(',')];

    filteredRows.forEach((row) => {
      const date = new Date(row.timestamp).toISOString().slice(0, 10);
      const values = [
        csvEscape(date),
        ...visibleMetrics.map((metric) => {
          const raw = row[metric.id];
          const numeric = Number(raw);
          return Number.isFinite(numeric) ? csvEscape(numeric) : '';
        }),
      ];
      lines.push(values.join(','));
    });

    const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `economic-data-table-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [filteredRows, visibleMetrics]);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Last Update</p>
          <p className="mt-1 text-xl font-semibold text-main">
            {datasetLastUpdateDate
              ? datasetLastUpdateDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
              : 'N/A'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Expected Next Update</p>
          <p className="mt-1 text-xl font-semibold text-main">
            {datasetExpectedNextDate
              ? datasetExpectedNextDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
              : 'N/A'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Countdown</p>
          <p className="mt-1 text-xl font-semibold text-main">{datasetCountdownText}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Data Quality</p>
          <p className="mt-1 text-xl font-semibold text-main">{datasetMissingCells.toLocaleString()} missing cells</p>
          <p className="mt-1 text-xs text-muted">
            of {totalExpectedCells.toLocaleString()} expected ({totalExpectedCells > 0 ? ((1 - datasetMissingCells / totalExpectedCells) * 100).toFixed(1) : '100'}% complete)
          </p>
          <p className={`mt-1 text-xs ${overdueMetricCount > 0 ? 'text-[color:var(--color-brand-primary)]' : 'text-link'}`}>
            {overdueMetricCount} metrics past expected cadence
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Data Health</p>
            <p className={`mt-1 text-sm font-semibold ${pipelineStatus?.status === 'FAIL' ? 'text-[color:var(--color-brand-primary)]' : 'text-main'}`}>
              {validationSummary}
            </p>
            <p className="mt-1 text-xs text-muted">
              {lastCheckedText ? `Last checked ${lastCheckedText}` : 'No recent validation data'}
            </p>
            <p className="mt-1 text-xs text-muted">{pipelineHealthText}</p>
          </div>
          <span className="rounded-full border border-theme bg-muted-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            {trackedSeriesCount} tracked
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
          <div className="rounded-xl border border-theme bg-muted-surface p-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Fresh</p>
            <p className="mt-1 text-xl font-semibold text-main">{dataHealthCounts.fresh}</p>
          </div>
          <div className="rounded-xl border border-theme bg-muted-surface p-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Carry-forward</p>
            <p className="mt-1 text-xl font-semibold text-main">{dataHealthCounts.carryForward}</p>
          </div>
          <div className="rounded-xl border border-theme bg-muted-surface p-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Needs attention</p>
            <p className="mt-1 text-xl font-semibold text-main">{dataHealthCounts.needsAttention}</p>
          </div>
          <div className="rounded-xl border border-theme bg-muted-surface p-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Latest month</p>
            <p className="mt-1 text-xl font-semibold text-main">{pipelineStatusApplies ? pipelineStatus?.latestDataMonth ?? 'N/A' : 'N/A'}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!pipelineStatusApplies && (
            <span className="rounded-full border border-theme bg-muted-surface px-3 py-1 text-xs font-medium text-muted">
              Bundled snapshot — pipeline status not applicable
            </span>
          )}
          {pipelineStatusApplies && pipelineStatus?.status === 'FAIL' && (
            <span className="rounded-full bg-[color:var(--color-brand-primary)]/10 px-3 py-1 text-xs font-medium text-[color:var(--color-brand-primary)]">
              Needs attention
            </span>
          )}
          {pipelineStatusApplies && pipelineStatus?.status === 'PASS' && statusIsStale && (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">
              Stale — pipeline may be stopped
            </span>
          )}
          {pipelineStatusApplies && pipelineStatus?.status === 'PASS' && !statusIsStale && (
            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
              Healthy
            </span>
          )}
          {dataHealthCounts.unknown > 0 && (
            <span className="rounded-full border border-theme bg-muted-surface px-3 py-1 text-xs font-medium text-muted">
              {dataHealthCounts.unknown} unknown
            </span>
          )}
        </div>
        {pipelineStatusApplies && pipelineStatus?.topAlerts && pipelineStatus.topAlerts.length > 0 && (
          <div className="mt-3 rounded-lg border border-theme bg-muted-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">What needs attention</p>
            <ul className="mt-2 space-y-1.5 text-xs text-main">
              {pipelineStatus.topAlerts.slice(0, 4).map((alert, index) => (
                <li key={`alert-${alert.type}-${alert.column}-${alert.month}-${index}`} className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0 text-[color:var(--color-brand-primary)]">&#9679;</span>
                  <span>
                    <span className="font-medium">{alert.column}</span>
                    {alert.type === 'Release Calendar'
                      ? ` data is delayed — latest available is ${new Date(alert.month + '-01').toLocaleString(undefined, { month: 'long', year: 'numeric' })}, expected by now`
                      : ` — ${alert.details}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Current Release</p>
            <h3 className="mt-1 text-lg font-semibold text-main">{BUILD_VERSION}</h3>
            <p className="mt-1 text-sm font-medium text-link">{BUILD_VERSION_LABEL}</p>
            <p className="mt-2 max-w-3xl text-sm text-muted">{BUILD_VERSION_SUMMARY}</p>
          </div>
          <span className="rounded-full border border-theme bg-muted-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            {BUILD_NOTES.length} recent commits
          </span>
        </div>
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{BUILD_NOTES_TITLE}</p>
          <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {BUILD_NOTES.slice(0, 6).map((note) => (
              <a
                key={`${note.hash}-${note.date}`}
                href={`https://github.com/browningtons/economic-dashboard/commit/${note.hash}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-theme bg-muted-surface px-3 py-2 no-underline transition-colors hover:bg-secondary"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-main">{note.title}</p>
                  <span className="shrink-0 rounded-full border border-theme px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {note.hash}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{note.date}</p>
              </a>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-main">Metric Freshness and Completeness</h3>
            <p className="text-xs text-muted">Metric names link directly to source series.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-theme bg-muted-surface px-3 py-1.5">
              <span className="text-[11px] font-medium text-muted uppercase tracking-wide">Freshness</span>
              <span className={`text-sm font-bold ${freshnessScore >= 80 ? 'text-green-600' : freshnessScore >= 50 ? 'text-amber-500' : 'text-[color:var(--color-brand-primary)]'}`}>
                {freshnessScore}%
              </span>
              <div className="h-2 w-16 rounded-full bg-theme/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${freshnessScore >= 80 ? 'bg-green-500' : freshnessScore >= 50 ? 'bg-amber-400' : 'bg-[color:var(--color-brand-primary)]'}`}
                  style={{ width: `${freshnessScore}%` }}
                />
              </div>
            </div>
            <span className="rounded-full border border-theme bg-muted-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              {metricHealthRows.length} metrics
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-theme text-muted">
                <th className="px-3 py-2 font-semibold">Metric</th>
                <th className="px-3 py-2 font-semibold">Cadence</th>
                <th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Last Value</th>
                <th className="px-3 py-2 font-semibold">Expected Next</th>
                <th className="px-3 py-2 font-semibold">Countdown</th>
                <th className="px-3 py-2 font-semibold">Missing (All)</th>
                <th className="px-3 py-2 font-semibold">Missing (12M)</th>
                <th className="px-3 py-2 font-semibold">Completeness</th>
              </tr>
            </thead>
            <tbody>
              {metricHealthRows.map((row) => {
                const isCurrentMonth = row.lastValueDate
                  ? `${row.lastValueDate.getFullYear()}-${String(row.lastValueDate.getMonth() + 1).padStart(2, '0')}` >= currentMonthStr
                  : false;
                const isLowest = lowestCompleteness?.id === row.id && parseFloat(row.completenessPct) < 100;
                const pct = parseFloat(row.completenessPct);

                return (
                <tr key={`health-${row.id}`} className={`border-b border-theme/40 ${isLowest ? 'bg-[color:var(--color-brand-primary)]/[0.04]' : ''}`}>
                  <td className="px-3 py-2 font-medium text-main">
                    <span className="flex items-center gap-1.5">
                      {row.source ? (
                        <a href={row.source.url} target="_blank" rel="noreferrer" className="text-link underline text-link-hover">
                          {row.label}
                        </a>
                      ) : (
                        row.label
                      )}
                      {isCurrentMonth && (
                        <span className="inline-flex items-center rounded-full bg-green-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                          Current
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted capitalize">{row.cadence}</td>
                  <td className="px-3 py-2 text-muted">
                    {row.source ? `${row.source.provider} (${row.source.seriesId})` : 'N/A'}
                  </td>
                  <td className="px-3 py-2 text-main">{row.lastValueDate ? row.lastValueDate.toLocaleDateString() : 'N/A'}</td>
                  <td className="px-3 py-2 text-main">{row.expectedNextDate ? row.expectedNextDate.toLocaleDateString() : 'N/A'}</td>
                  <td className={`px-3 py-2 font-medium ${row.isOverdue ? 'text-[color:var(--color-brand-primary)]' : 'text-link'}`}>
                    {row.countdownText}
                  </td>
                  <td className={`px-3 py-2 ${row.missingCount > 0 ? 'text-[color:var(--color-brand-primary)]' : 'text-muted'}`}>
                    {row.missingCount}
                  </td>
                  <td className={`px-3 py-2 ${row.missingRecentCount > 0 ? 'text-[color:var(--color-brand-primary)]' : 'text-muted'}`}>
                    {row.missingRecentCount}
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <div className="h-1.5 w-12 rounded-full bg-theme/20 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 99 ? 'bg-green-500' : pct >= 90 ? 'bg-amber-400' : 'bg-[color:var(--color-brand-primary)]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`tabular-nums ${isLowest ? 'font-bold text-[color:var(--color-brand-primary)]' : 'text-main'}`}>
                        {row.completenessPct}%
                      </span>
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-main">Raw Data Table</h3>
            <p className="text-xs text-muted">Search, filter, choose columns, and export the current view.</p>
          </div>
          <span className="rounded-full border border-theme bg-muted-surface px-2 py-1 text-xs text-muted">
            {totalRows.toLocaleString()} rows
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search date, metric label, or value"
            className="min-w-[260px] flex-1 rounded-md border border-theme bg-secondary px-3 py-2 text-sm text-main"
          />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-md border border-theme bg-secondary px-3 py-2 text-sm text-main"
          >
            <option value="ALL">All years</option>
            {years.map((year) => (
              <option key={`year-${year}`} value={year}>{year}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-md border border-theme bg-secondary px-3 py-2 text-sm text-main">
            <input
              type="checkbox"
              checked={showMissingOnly}
              onChange={(e) => setShowMissingOnly(e.target.checked)}
            />
            Missing only
          </label>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-md border border-theme bg-secondary px-3 py-2 text-sm text-main">
              Columns ({visibleMetrics.length}/{tableMetrics.length})
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-80 max-h-80 overflow-y-auto rounded-xl border border-theme bg-secondary p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={setAllColumns}
                  className="rounded-md border border-theme bg-muted-surface px-2 py-1 text-xs"
                >
                  Show all
                </button>
              </div>
              <div className="space-y-1">
                {tableMetrics.map((metric) => (
                  <label key={`col-${metric.id}`} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted-surface">
                    <input
                      type="checkbox"
                      checked={visibleMetricIds.includes(metric.id)}
                      onChange={() => toggleMetricColumn(metric.id)}
                    />
                    <span>{metric.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-md border border-theme bg-muted-surface px-3 py-2 text-sm text-main"
          >
            Export CSV
          </button>
        </div>

        <div
          ref={tableScrollerRef}
          className="max-h-[620px] overflow-auto rounded-lg border border-theme"
          onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        >
          <table className="min-w-[1400px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-secondary">
              <tr className="border-b border-theme">
                <th className="px-3 py-2 font-semibold text-main">Observed Date</th>
                {visibleMetrics.map((metric) => {
                  const source = metricSources[metric.id];
                  return (
                    <th key={`table-header-${metric.id}`} className="px-3 py-2 font-semibold text-main">
                      {source ? (
                        <a href={source.url} target="_blank" rel="noreferrer" className="text-link underline text-link-hover">
                          {metric.label}
                        </a>
                      ) : (
                        metric.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {topPad > 0 && (
                <tr style={{ height: `${topPad}px` }}>
                  <td colSpan={visibleMetrics.length + 1} />
                </tr>
              )}

              {windowedRows.map((row, rowIndex) => (
                <tr key={`raw-row-${row.timestamp}-${rowIndex}`} className="border-b border-theme/30" style={{ height: `${ROW_HEIGHT}px` }}>
                  <td className="px-3 py-2 font-mono text-main">{new Date(row.timestamp).toLocaleDateString()}</td>
                  {visibleMetrics.map((metric) => {
                    const rawValue = Number(row[metric.id]);
                    const hasValue = Number.isFinite(rawValue);
                    return (
                      <td key={`raw-${row.timestamp}-${metric.id}`} className={`px-3 py-2 ${hasValue ? 'text-main' : 'text-[color:var(--color-brand-primary)]'}`}>
                        {hasValue ? metric.format(rawValue) : 'MISSING'}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {bottomPad > 0 && (
                <tr style={{ height: `${bottomPad}px` }}>
                  <td colSpan={visibleMetrics.length + 1} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
});

export default DataTableView;
