import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Card from './Card';
import type { Cadence, DataPoint, DataSourceInfo, MetricConfig, PipelineStatus } from '../types/dashboard';

interface MetricHealthRow {
  id: string;
  label: string;
  source?: DataSourceInfo;
  cadence: Cadence;
  lastValueDate: Date | null;
  expectedNextDate: Date | null;
  countdownText: string;
  isOverdue: boolean;
  missingCount: number;
  missingRecentCount: number;
  completenessPct: string;
}

interface DataTableViewProps {
  data: DataPoint[];
  metrics: MetricConfig[];
  metricSources: Record<string, DataSourceInfo>;
  now: Date;
  pipelineStatus?: PipelineStatus | null;
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

export default function DataTableView({ data, metrics, metricSources, now, pipelineStatus }: DataTableViewProps) {
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
      let lastTimestamp: number | null = null;

      data.forEach((point, index) => {
        const value = Number(point[metric.id]);
        const hasValue = Number.isFinite(value);

        if (hasValue) {
          lastTimestamp = Number(point.timestamp);
          return;
        }

        missingCount += 1;
        if (index >= recentWindowStart) missingRecentCount += 1;
      });

      const lastValueDate = lastTimestamp ? new Date(lastTimestamp) : null;
      const expectedNextDate = lastValueDate ? addCadenceWindow(lastValueDate, cadence) : null;
      const isOverdue = expectedNextDate ? expectedNextDate.getTime() < now.getTime() : false;

      return {
        id: metric.id,
        label: metric.label,
        source,
        cadence,
        lastValueDate,
        expectedNextDate,
        countdownText: expectedNextDate ? formatCountdownStatus(expectedNextDate, now) : 'No observations',
        isOverdue,
        missingCount,
        missingRecentCount,
        completenessPct: data.length ? (((data.length - missingCount) / data.length) * 100).toFixed(1) : '0.0',
      };
    });

    return rows.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
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

  const overdueMetricCount = useMemo(
    () => metricHealthRows.filter((row) => row.isOverdue).length,
    [metricHealthRows]
  );

  const pipelineHealthText = pipelineStatus?.status === 'FAIL'
    ? 'Validation issues detected in the last pipeline run.'
    : pipelineStatus?.status === 'PASS'
      ? 'Latest validation passed.'
      : 'Pipeline status unavailable.';

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
          <p className={`mt-1 text-xs ${overdueMetricCount > 0 ? 'text-[color:var(--color-brand-primary)]' : 'text-link'}`}>
            {overdueMetricCount} metrics past expected cadence
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Pipeline Health</p>
            <p className={`mt-1 text-sm font-semibold ${pipelineStatus?.status === 'FAIL' ? 'text-[color:var(--color-brand-primary)]' : 'text-main'}`}>
              {pipelineHealthText}
            </p>
            <p className="mt-1 text-xs text-muted">
              {pipelineStatus?.generatedAt
                ? `Last validation: ${new Date(pipelineStatus.generatedAt).toLocaleString()}`
                : 'Validation timestamp not available.'}
            </p>
          </div>
          <div className="text-xs text-muted">
            <p>Failed checks: {pipelineStatus?.failureCount ?? 0}</p>
            <p>Series failing: {pipelineStatus?.failedSeriesCount ?? 0} / {pipelineStatus?.totalSeriesCount ?? metrics.length}</p>
          </div>
        </div>
        {pipelineStatus?.topAlerts && pipelineStatus.topAlerts.length > 0 && (
          <div className="mt-3 rounded-lg border border-theme bg-muted-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Top Alerts</p>
            <ul className="mt-2 space-y-1 text-xs text-main">
              {pipelineStatus.topAlerts.slice(0, 4).map((alert, index) => (
                <li key={`alert-${alert.type}-${alert.column}-${alert.month}-${index}`}>
                  <span className="font-medium">{alert.type}</span> · {alert.column} · {alert.month}: {alert.details}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-main">Metric Freshness and Completeness</h3>
            <p className="text-xs text-muted">Metric names link directly to source series.</p>
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
              {metricHealthRows.map((row) => (
                <tr key={`health-${row.id}`} className="border-b border-theme/40">
                  <td className="px-3 py-2 font-medium text-main">
                    {row.source ? (
                      <a href={row.source.url} target="_blank" rel="noreferrer" className="text-link underline text-link-hover">
                        {row.label}
                      </a>
                    ) : (
                      row.label
                    )}
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
                  <td className="px-3 py-2 text-main">{row.completenessPct}%</td>
                </tr>
              ))}
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
}
