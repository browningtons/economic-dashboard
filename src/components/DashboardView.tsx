import React, { useMemo, useState } from 'react';
import type { DashboardPreset } from '../presets';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HelpCircle, Menu, X } from 'lucide-react';
import Card from './Card';
import DateRangeSlider from './DateRangeSlider';
import type {
  DashboardMetricConfidence,
  DataPoint,
  MetricConfidenceLevel,
  MetricConfig,
  ReferenceLabelPosition,
  ReferenceZone,
} from '../types/dashboard';

interface ExtremaDotProps {
  cx?: number;
  cy?: number;
  value?: number | string;
  payload?: {
    timestamp?: number | string;
  };
}

interface DashboardViewProps {
  shareMode: boolean;
  viewMode: 'raw' | 'relative';
  setViewMode: React.Dispatch<React.SetStateAction<'raw' | 'relative'>>;
  chartMetricTitle: string;
  selectedMetrics: string[];
  rangeLabel: string;
  latestDataPointText: string;
  lastUpdatedText: string;
  dataWarning: string | null;
  metrics: MetricConfig[];
  setSelectedMetrics: React.Dispatch<React.SetStateAction<string[]>>;
  toggleMetric: (id: string) => void;
  data: DataPoint[];
  dateRange: [number, number];
  handleDateRangeChange: (nextRange: [number, number]) => void;
  datePreset: '1Y' | '3Y' | '5Y' | '10Y' | 'MAX';
  applyDatePreset: (preset: '1Y' | '3Y' | '5Y' | '10Y' | 'MAX') => void;
  activeMetrics: MetricConfig[];
  rSquared: string | null;
  chartData: DataPoint[];
  leftAxisColor: string;
  rightAxisColor: string;
  leftAxisTitle: string;
  rightAxisTitle: string;
  useRightAxis: boolean;
  getAxisId: (metricId: string) => 'left' | 'right';
  renderExtremaDot: (metric: MetricConfig, dotProps: ExtremaDotProps) => React.ReactNode;
  referenceZones: ReferenceZone[];
  renderReferenceLabel: (props: { viewBox: { x: number; y: number; width: number; height: number } }, label: string, labelPos: ReferenceLabelPosition) => React.ReactElement;
  dashboardTooltip: React.ReactElement;
  activeMetricConfidence: DashboardMetricConfidence[];
  presets: DashboardPreset[];
  activePreset: string | null;
  onApplyPreset: (preset: DashboardPreset) => void;
}

function getConfidenceTone(level: MetricConfidenceLevel) {
  if (level === 'fresh') {
    return {
      surface: {
        backgroundColor: 'color-mix(in oklab, var(--color-brand-accent) 8%, var(--color-bg-secondary))',
        borderColor: 'color-mix(in oklab, var(--color-brand-accent) 22%, var(--color-border))',
      },
      badge: {
        backgroundColor: 'color-mix(in oklab, var(--color-brand-accent) 14%, var(--color-bg-secondary))',
        borderColor: 'color-mix(in oklab, var(--color-brand-accent) 35%, var(--color-border))',
        color: 'var(--color-brand-accent)',
      },
      dot: { backgroundColor: 'var(--color-brand-accent)' },
    };
  }

  if (level === 'carry-forward') {
    return {
      surface: {
        backgroundColor: 'color-mix(in oklab, var(--color-brand-primary) 6%, var(--color-bg-secondary))',
        borderColor: 'color-mix(in oklab, var(--color-brand-primary) 18%, var(--color-border))',
      },
      badge: {
        backgroundColor: 'color-mix(in oklab, var(--color-brand-primary) 12%, var(--color-bg-secondary))',
        borderColor: 'color-mix(in oklab, var(--color-brand-primary) 28%, var(--color-border))',
        color: 'var(--color-brand-primary)',
      },
      dot: { backgroundColor: 'var(--color-brand-primary)' },
    };
  }

  if (level === 'warning') {
    return {
      surface: {
        backgroundColor: 'color-mix(in oklab, var(--color-brand-secondary) 6%, var(--color-bg-secondary))',
        borderColor: 'color-mix(in oklab, var(--color-brand-secondary) 18%, var(--color-border))',
      },
      badge: {
        backgroundColor: 'color-mix(in oklab, var(--color-brand-secondary) 10%, var(--color-bg-secondary))',
        borderColor: 'color-mix(in oklab, var(--color-brand-secondary) 24%, var(--color-border))',
        color: 'var(--color-brand-secondary)',
      },
      dot: { backgroundColor: 'var(--color-brand-secondary)' },
    };
  }

  if (level === 'lagging') {
    return {
      surface: {
        backgroundColor: 'color-mix(in oklab, var(--color-brand-primary) 9%, var(--color-bg-secondary))',
        borderColor: 'color-mix(in oklab, var(--color-brand-primary) 24%, var(--color-border))',
      },
      badge: {
        backgroundColor: 'color-mix(in oklab, var(--color-brand-primary) 15%, var(--color-bg-secondary))',
        borderColor: 'color-mix(in oklab, var(--color-brand-primary) 34%, var(--color-border))',
        color: 'var(--color-brand-primary)',
      },
      dot: { backgroundColor: 'var(--color-brand-primary)' },
    };
  }

  return {
    surface: {
      backgroundColor: 'var(--color-surface-muted)',
      borderColor: 'var(--color-border)',
    },
    badge: {
      backgroundColor: 'var(--color-bg-secondary)',
      borderColor: 'var(--color-border)',
      color: 'var(--color-text-muted)',
    },
    dot: { backgroundColor: 'var(--color-text-muted)' },
  };
}

function formatMetricMonth(value?: string | number) {
  if (value === undefined || value === null || value === '') return 'N/A';
  if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

const DashboardView = React.memo(function DashboardView({
  shareMode,
  viewMode,
  setViewMode,
  chartMetricTitle,
  selectedMetrics,
  rangeLabel,
  latestDataPointText,
  lastUpdatedText,
  dataWarning,
  metrics,
  setSelectedMetrics,
  toggleMetric,
  data,
  dateRange,
  handleDateRangeChange,
  datePreset,
  applyDatePreset,
  activeMetrics,
  rSquared,
  chartData,
  leftAxisColor,
  rightAxisColor,
  leftAxisTitle,
  rightAxisTitle,
  useRightAxis,
  getAxisId,
  renderExtremaDot,
  referenceZones,
  renderReferenceLabel,
  dashboardTooltip,
  activeMetricConfidence,
  presets,
  activePreset,
  onApplyPreset,
}: DashboardViewProps) {
  // Local UI state — kept here to avoid re-rendering sibling tabs
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [metricSearch, setMetricSearch] = useState('');

  const metricsByCategory = useMemo(() => {
    const groups: Record<string, MetricConfig[]> = {};
    metrics.forEach(m => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, [metrics]);

  const filteredMetricsByCategory = useMemo(() => {
    const q = metricSearch.trim().toLowerCase();
    if (!q) return metricsByCategory;
    const out: Record<string, MetricConfig[]> = {};
    for (const [category, list] of Object.entries(metricsByCategory)) {
      const matches = list.filter((m) => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
      if (matches.length) out[category] = matches;
    }
    return out;
  }, [metricsByCategory, metricSearch]);

  const confidenceByMetricId = new Map(
    activeMetricConfidence.map((entry) => [entry.metric.id, entry] as const)
  );

  return (
    <>
      <Card className={`flex-1 flex flex-col relative ${shareMode ? 'min-h-[760px]' : 'min-h-[500px]'} p-7`}>
        {!shareMode && (
          <button
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="absolute right-7 top-7 z-20 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-theme bg-muted-surface text-main shadow-sm transition-colors hover:bg-secondary"
            title={filtersOpen ? 'Hide filters' : 'Show filters'}
            aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
          >
            {filtersOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
        <div className={`flex flex-col ${shareMode ? 'mb-5 gap-3' : 'mb-8 gap-4'} z-10`}>
          <div className={!shareMode ? 'pr-14' : ''}>
            <h2 className="text-3xl md:text-4xl font-semibold text-main flex items-center gap-2">
              {viewMode === 'relative' ? 'Relative Performance Index' : 'Cycle Signals'}
            </h2>
            {chartMetricTitle && (
              <p className="text-sm text-muted mt-1 font-medium">
                {chartMetricTitle}
              </p>
            )}
            <p className="text-sm text-muted mt-1">
              {viewMode === 'relative'
                ? 'Comparing percentage growth relative to start date (Base = 100)'
                : 'Historical absolute values over time'}
            </p>
            {/* Story presets */}
            <div className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {presets.map((preset) => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onApplyPreset(preset)}
                    title={preset.tagline}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)] text-white shadow-sm'
                        : 'border-theme bg-secondary text-muted hover:text-main hover:border-[var(--color-brand-accent)] hover:bg-muted-surface'
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-theme bg-muted-surface px-2 py-1 text-muted">{selectedMetrics.length} metrics</span>
              <span className="rounded-full border border-theme bg-muted-surface px-2 py-1 text-muted">Range: {rangeLabel}</span>
              <span className="rounded-full border border-theme bg-muted-surface px-2 py-1 text-muted">Latest data point: {latestDataPointText}</span>
            </div>
            {dataWarning && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-theme bg-muted-surface px-2 py-1 text-muted">{dataWarning}</span>
              </div>
            )}
          </div>
        </div>

        <div className="w-full">
          {!shareMode && filtersOpen && (
            <div className="mb-3 rounded-lg border border-theme bg-muted-surface/70 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedMetrics[0] ?? metrics[0].id}
                  onChange={(e) => setSelectedMetrics((prev) => [e.target.value, prev[1] ?? prev[0] ?? e.target.value])}
                  className="rounded-md border border-theme bg-secondary px-3 py-2 text-sm"
                >
                  {Object.entries(metricsByCategory).map(([category, catMetrics]) => (
                    <optgroup key={category} label={category}>
                      {catMetrics.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </optgroup>
                  ))}
                </select>
                <span className="text-sm text-muted">vs</span>
                <select
                  value={selectedMetrics[1] ?? metrics[1].id}
                  onChange={(e) => setSelectedMetrics((prev) => [prev[0] ?? metrics[0].id, e.target.value])}
                  className="rounded-md border border-theme bg-secondary px-3 py-2 text-sm"
                >
                  {Object.entries(metricsByCategory).map(([category, catMetrics]) => (
                    <optgroup key={category} label={category}>
                      {catMetrics.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </optgroup>
                  ))}
                </select>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setViewMode('raw')} className={`rounded-md border px-3 py-2 text-sm ${viewMode === 'raw' ? 'bg-muted-surface border-theme' : 'border-theme'}`}>Raw</button>
                  <button onClick={() => setViewMode('relative')} className={`rounded-md border px-3 py-2 text-sm ${viewMode === 'relative' ? 'bg-muted-surface border-theme' : 'border-theme'}`}>Relative</button>
                  <details className="relative">
                    <summary className="cursor-pointer list-none rounded-md border border-theme px-3 py-2 text-sm">More Filters</summary>
                    <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-theme bg-secondary p-3 shadow-lg">
                      <input
                        value={metricSearch}
                        onChange={(e) => setMetricSearch(e.target.value)}
                        placeholder="Search metrics..."
                        className="mb-3 w-full rounded-md border border-theme bg-secondary px-2.5 py-1.5 text-sm text-main"
                      />
                      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                        {Object.entries(filteredMetricsByCategory).map(([category, catMetrics]) => (
                          <div key={category}>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">{category}</p>
                            <div className="space-y-1">
                              {catMetrics.map((m) => (
                                <label key={m.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted-surface">
                                  <input type="checkbox" checked={selectedMetrics.includes(m.id)} onChange={() => toggleMetric(m.id)} />
                                  <span>{m.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
              </div>

              {data.length > 1 && (
                <div className="mt-3">
                  <DateRangeSlider
                    min={0}
                    max={data.length - 1}
                    value={dateRange}
                    onChange={handleDateRangeChange}
                    data={data}
                  />
                </div>
              )}
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-theme bg-muted-surface p-1">
              {(['1Y', '3Y', '5Y', '10Y', 'MAX'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => applyDatePreset(preset)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${datePreset === preset ? 'bg-secondary text-main shadow-sm border border-theme' : 'text-muted hover:text-main'}`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {activeMetrics.length === 2 && rSquared && (
              <div className="group relative flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-lg shadow-sm border border-theme">
                <span className="text-sm font-bold text-main">
                  R<sup>2</sup> = {rSquared}
                </span>
                <HelpCircle className="w-4 h-4 text-muted hover:text-[color:var(--color-brand-primary)] transition-colors" />
                <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-main text-inverse text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none transform translate-y-1 group-hover:translate-y-0 z-30">
                  <div className="font-bold text-sm mb-2 text-link">R² made simple</div>
                  <p className="mb-2 text-inverse-muted leading-relaxed">R² shows how much these two lines move together in your selected time range.</p>
                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold block mb-0.5" style={{ color: 'var(--color-brand-secondary)' }}>How to read {rSquared}:</span>
                      <span className="text-inverse-muted">About {Math.round(Number(rSquared) * 100)}% of movement is shared, and the rest is not.</span>
                    </div>
                    <div>
                      <span className="font-semibold block mb-0.5" style={{ color: 'var(--color-brand-accent)' }}>Quick scale:</span>
                      <span className="text-inverse-muted">Closer to 1.0 means stronger relationship; closer to 0 means weaker.</span>
                    </div>
                    <div>
                      <span className="font-semibold block mb-0.5" style={{ color: 'var(--color-brand-primary)' }}>Important:</span>
                      <span className="text-inverse-muted">High R² is correlation, not causation. Use it as a signal, not proof.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`${shareMode ? 'h-[640px]' : 'h-[560px]'} w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 46 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />

                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  stroke="var(--color-chart-axis)"
                  fontSize={12}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
                  }}
                  tickMargin={10}
                  minTickGap={40}
                  axisLine={{ stroke: 'var(--color-chart-grid)', strokeWidth: 1 }}
                  tickLine={false}
                />

                <YAxis
                  yAxisId="left"
                  stroke={leftAxisColor}
                  fontSize={13}
                  orientation="left"
                  label={{ value: leftAxisTitle, angle: -90, position: 'insideLeft', offset: 2, style: { fill: leftAxisColor, fontSize: 13, fontWeight: 700 } }}
                  tickFormatter={(val) => viewMode === 'relative' ? `${val}%` : Number(val).toLocaleString()}
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  width={68}
                />

                {useRightAxis && viewMode === 'raw' && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={rightAxisColor}
                    fontSize={13}
                    label={{ value: rightAxisTitle, angle: 90, position: 'insideRight', offset: 2, style: { fill: rightAxisColor, fontSize: 13, fontWeight: 700 } }}
                    tickFormatter={(val) => Number(val).toLocaleString()}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    width={68}
                  />
                )}

                <Tooltip content={dashboardTooltip} />
                <Legend verticalAlign="top" height={36} content={() => null} />

                {referenceZones.map((zone, index) => (
                  <ReferenceArea
                    key={index}
                    x1={new Date(zone.start).getTime()}
                    x2={new Date(zone.end).getTime()}
                    yAxisId="left"
                    fill={zone.color}
                    fillOpacity={0.12}
                    label={(props) => renderReferenceLabel(props, `ⓘ ${zone.label}`, zone.labelPos)}
                  />
                ))}

                {activeMetrics.map((m) => {
                  const axisId = getAxisId(m.id);

                  return (
                    <Line
                      key={m.id}
                      yAxisId={axisId}
                      type="monotone"
                      dataKey={m.id}
                      name={m.label}
                      stroke={m.color}
                      strokeWidth={4}
                      dot={(dotProps) => renderExtremaDot(m, dotProps)}
                      activeDot={{ r: 4, strokeWidth: 0, fill: m.color }}
                      animationDuration={1000}
                      connectNulls
                    />
                  );
                })}

                {viewMode === 'relative' && (
                  <Line
                    yAxisId="left"
                    dataKey={() => 100}
                    stroke="var(--color-chart-baseline)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    dot={false}
                    name="Baseline"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5 border-t border-subtle pt-4">
          {activeMetrics.map((m) => (
            <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted-surface rounded-full border border-theme">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
              <span className={`${shareMode ? 'text-[19px]' : 'text-[16px]'} font-medium text-main`}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
        <p className={`${shareMode ? 'mt-3 text-sm' : 'mt-2 text-xs'} text-center text-muted`}>
          Data last updated: {lastUpdatedText}
        </p>
      </Card>

      {!shareMode && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {activeMetrics.slice(0, 4).map((m) => {
              const confidence = confidenceByMetricId.get(m.id);
              const tone = getConfidenceTone(confidence?.level ?? 'unknown');
              const validPoints = data.filter((d) => d[m.id] !== undefined);
              const lastPoint = validPoints[validPoints.length - 1];
              const prevPoint = validPoints[validPoints.length - 2];
              const lastValue = lastPoint ? Number(lastPoint[m.id]) : 0;
              const prevValue = prevPoint ? Number(prevPoint[m.id]) : 0;
              const delta = prevValue ? ((lastValue - prevValue) / prevValue) * 100 : 0;
              const latestMetricMonth = confidence?.pipeline?.csvLatest ?? lastPoint?.timestamp;
              return (
                <Card key={`headline-${m.id}`} className="p-4">
                  <p className="text-xs uppercase tracking-wider text-muted">{m.label}</p>
                  {confidence && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={tone.dot} />
                      <span
                        className="inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] leading-none"
                        style={tone.badge}
                      >
                        {confidence.label}
                      </span>
                    </div>
                  )}
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Latest value</p>
                  <p className="mt-1 text-2xl font-semibold text-main">{m.format(lastValue)}</p>
                  <p className={`mt-1 text-xs ${delta >= 0 ? 'text-link' : 'text-[color:var(--color-brand-primary)]'}`}>
                    {delta >= 0 ? '+' : ''}
                    {delta.toFixed(1)}%
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    Current through {formatMetricMonth(latestMetricMonth)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Refresh checked {lastUpdatedText}
                  </p>
                  {confidence && (
                    <p className="mt-2 text-xs text-muted">{confidence.detail}</p>
                  )}
                </Card>
              );
            })}
          </div>

          <Card className="p-4">
            <p className="text-sm font-semibold text-main">Key Takeaway</p>
            <p className="mt-1 text-sm text-muted">
              {activeMetrics.length >= 2
                ? `${activeMetrics[0].label} and ${activeMetrics[1].label} are diverging. Review trend slopes for confirmation and monitor next data release.`
                : 'Select two indicators to generate a stronger comparative takeaway.'}
            </p>
          </Card>
        </>
      )}
    </>
  );
});

export default DashboardView;
