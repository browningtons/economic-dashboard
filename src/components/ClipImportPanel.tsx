import React, { useCallback, useState } from 'react';
import { Sparkles, Loader2, Wand2, AlertCircle } from 'lucide-react';
import {
  DASHBOARD_METRICS,
  RANGE_LABELS,
  generateClipDraftFromDashboard,
} from '../clipDataSources';
import type {
  DashboardDataSource,
  DashboardRange,
  DashboardResolution,
  GeneratedClipDraft,
} from '../clipDataSources';

interface ClipImportPanelProps {
  onGenerate: (draft: GeneratedClipDraft) => void;
}

type ImportState = 'idle' | 'loading' | 'error';

const RANGES: DashboardRange[] = ['1Y', '3Y', '5Y', 'MAX'];
const RESOLUTIONS: { value: DashboardResolution; label: string }[] = [
  { value: 'auto', label: 'Auto (≈15)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const ClipImportPanel = React.memo(function ClipImportPanel({ onGenerate }: ClipImportPanelProps) {
  const [metricId, setMetricId] = useState<string>(DASHBOARD_METRICS[0]?.id ?? '');
  const [range, setRange] = useState<DashboardRange>('5Y');
  const [resolution, setResolution] = useState<DashboardResolution>('auto');
  const [state, setState] = useState<ImportState>('idle');
  const [error, setError] = useState<string | null>(null);

  const selectedMetric: DashboardDataSource | undefined = DASHBOARD_METRICS.find(
    (m) => m.id === metricId,
  );

  const handleGenerate = useCallback(async () => {
    if (!selectedMetric) return;
    setState('loading');
    setError(null);
    try {
      const draft = await generateClipDraftFromDashboard(selectedMetric, range, resolution);
      onGenerate(draft);
      setState('idle');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Unknown error generating clip.');
    }
  }, [selectedMetric, range, resolution, onGenerate]);

  const fieldClass =
    'w-full rounded-md border border-theme bg-secondary px-3 py-1.5 text-sm text-main focus:outline-none focus:ring-2 focus:ring-[var(--color-link)]/40';
  const labelClass =
    'block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1';

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'color-mix(in oklab, var(--color-brand-accent) 35%, var(--color-border))',
        backgroundColor:
          'color-mix(in oklab, var(--color-brand-accent) 8%, var(--color-bg-secondary))',
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'color-mix(in oklab, var(--color-brand-accent) 20%, transparent)',
              color: 'var(--color-brand-accent)',
            }}
          >
            <Wand2 size={14} aria-hidden />
          </span>
          <div>
            <div className="text-sm font-semibold text-main">Import from dashboard data</div>
            <div className="text-[11px] text-muted">
              Generate a time-series clip from any tracked indicator in one click.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="import-metric">
            Metric
          </label>
          <select
            id="import-metric"
            className={fieldClass}
            value={metricId}
            onChange={(e) => setMetricId(e.target.value)}
          >
            {DASHBOARD_METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayLabel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="import-resolution">
            Resolution
          </label>
          <select
            id="import-resolution"
            className={fieldClass}
            value={resolution}
            onChange={(e) => setResolution(e.target.value as DashboardResolution)}
          >
            {RESOLUTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className={labelClass}>Range</span>
          <div className="inline-flex rounded-lg border border-theme bg-muted-surface p-0.5">
            {RANGES.map((r) => {
              const isActive = range === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-secondary text-main shadow-sm border border-theme'
                      : 'text-muted hover:text-main'
                  }`}
                  title={RANGE_LABELS[r]}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={state === 'loading' || !selectedMetric}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            color: 'var(--color-brand-primary)',
            borderColor: 'color-mix(in oklab, var(--color-brand-primary) 40%, transparent)',
            backgroundColor:
              'color-mix(in oklab, var(--color-brand-primary) 12%, var(--color-bg-secondary))',
          }}
        >
          {state === 'loading' ? (
            <>
              <Loader2 size={14} aria-hidden className="animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles size={14} aria-hidden />
              Generate clip
            </>
          )}
        </button>
      </div>

      {error && (
        <div
          className="mt-3 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[11px]"
          style={{
            color: 'var(--color-brand-primary)',
            borderColor: 'color-mix(in oklab, var(--color-brand-primary) 40%, transparent)',
            backgroundColor: 'color-mix(in oklab, var(--color-brand-primary) 8%, transparent)',
          }}
        >
          <AlertCircle size={12} aria-hidden />
          {error}
        </div>
      )}
    </div>
  );
});

export default ClipImportPanel;
