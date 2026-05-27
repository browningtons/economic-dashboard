import React, { useMemo } from 'react';
import type { ClipItem } from '../types/clips';

interface ClipChartProps {
  items: ClipItem[];
  unitPrefix?: string;
  unitSuffix?: string;
  valuePrecision?: number;
  compact?: boolean;
}

const formatValue = (value: number, precision = 1, prefix = '', suffix = ''): string => {
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return `${prefix}${formatted}${suffix}`;
};

const ClipChart = React.memo(function ClipChart({
  items,
  unitPrefix = '',
  unitSuffix = '',
  valuePrecision = 1,
  compact = false,
}: ClipChartProps) {
  const maxValue = useMemo(
    () => items.reduce((max, item) => Math.max(max, item.value), 0),
    [items],
  );

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-subtle bg-muted-surface/60 px-4 py-6 text-center text-sm text-muted">
        No data points yet — add some items in the remixer below.
      </div>
    );
  }

  const rowHeight = compact ? 28 : 34;
  const labelWidth = compact ? 132 : 168;

  return (
    <div className="w-full">
      <div className="flex flex-col" style={{ gap: compact ? 6 : 8 }}>
        {items.map((item, index) => {
          const widthPct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const isHighlight = Boolean(item.highlight);

          const barColor = isHighlight
            ? 'var(--color-brand-primary)'
            : 'var(--color-brand-secondary)';
          const barFillStyle: React.CSSProperties = isHighlight
            ? {
                background: 'linear-gradient(90deg, var(--color-brand-primary) 0%, #FF7A33 100%)',
              }
            : {
                background: 'linear-gradient(90deg, var(--color-brand-secondary) 0%, #4C6F86 100%)',
              };

          return (
            <div
              key={`${item.label}-${index}`}
              className="flex items-center gap-3"
              style={{ minHeight: rowHeight }}
            >
              <div
                className="flex shrink-0 items-center gap-2 text-sm font-medium text-main"
                style={{ width: labelWidth }}
                title={item.label}
              >
                <span className="w-4 text-right font-mono text-[11px] text-muted">{index + 1}.</span>
                {item.flag && (
                  <span aria-hidden className="text-base leading-none">
                    {item.flag}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
                {isHighlight && (
                  <span
                    className="shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                    style={{
                      color: 'var(--color-brand-primary)',
                      borderColor: 'color-mix(in oklab, var(--color-brand-primary) 35%, transparent)',
                      backgroundColor:
                        'color-mix(in oklab, var(--color-brand-primary) 12%, var(--color-bg-secondary))',
                    }}
                    aria-label="Highlighted item"
                  >
                    Focus
                  </span>
                )}
              </div>

              <div className="relative flex-1">
                <div
                  className="h-full rounded-md border border-subtle bg-muted-surface/60"
                  style={{ height: rowHeight - 12 }}
                />
                <div
                  className="absolute left-0 top-0 rounded-md shadow-sm transition-[width] duration-500 ease-out"
                  style={{
                    width: `${widthPct}%`,
                    height: rowHeight - 12,
                    ...barFillStyle,
                  }}
                  aria-hidden
                />
              </div>

              <div
                className="shrink-0 font-mono text-sm font-semibold"
                style={{ width: compact ? 78 : 92, textAlign: 'right', color: barColor }}
              >
                {formatValue(item.value, valuePrecision, unitPrefix, unitSuffix)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ClipChart;
