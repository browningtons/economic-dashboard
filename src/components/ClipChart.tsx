import React, { useMemo } from 'react';
import type { ClipItem } from '../types/clips';

interface ClipChartProps {
  items: ClipItem[];
  unitPrefix?: string;
  unitSuffix?: string;
  valuePrecision?: number;
  compact?: boolean;
  rowHeight?: number;
  labelWidth?: number;
  valueWidth?: number;
  fontScale?: number;
}

const formatValue = (value: number, precision = 1, prefix = '', suffix = ''): string => {
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return `${prefix}${formatted}${suffix}`;
};

const formatItemValue = (
  item: ClipItem,
  clipPrefix: string,
  clipSuffix: string,
  clipPrecision: number,
): string => {
  return formatValue(
    item.value,
    item.valuePrecision ?? clipPrecision,
    item.unitPrefix ?? clipPrefix,
    item.unitSuffix ?? clipSuffix,
  );
};

const ClipChart = React.memo(function ClipChart({
  items,
  unitPrefix = '',
  unitSuffix = '',
  valuePrecision = 1,
  compact = false,
  rowHeight: rowHeightOverride,
  labelWidth: labelWidthOverride,
  valueWidth: valueWidthOverride,
  fontScale = 1,
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

  const rowHeight = rowHeightOverride ?? (compact ? 28 : 34);
  const labelWidth = labelWidthOverride ?? (compact ? 132 : 168);
  const valueWidth = valueWidthOverride ?? (compact ? 78 : 92);
  const gap = Math.max(4, Math.round(8 * fontScale));
  const labelFontSize = Math.round(14 * fontScale);
  const numFontSize = Math.round(11 * fontScale);
  const flagFontSize = Math.round(16 * fontScale);
  const valueFontSize = Math.round(14 * fontScale);
  const focusFontSize = Math.round(9 * fontScale);

  return (
    <div className="w-full">
      <div className="flex flex-col" style={{ gap: compact ? Math.max(4, gap - 2) : gap }}>
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
              className="flex items-center"
              style={{ minHeight: rowHeight, gap }}
            >
              <div
                className="flex shrink-0 items-center font-medium text-main"
                style={{ width: labelWidth, gap: Math.max(4, gap - 2), fontSize: labelFontSize }}
                title={item.label}
              >
                <span
                  className="text-right font-mono text-muted"
                  style={{ width: Math.max(14, Math.round(16 * fontScale)), fontSize: numFontSize }}
                >
                  {index + 1}.
                </span>
                {item.flag && (
                  <span aria-hidden className="leading-none" style={{ fontSize: flagFontSize }}>
                    {item.flag}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
                {isHighlight && fontScale >= 0.95 && (
                  <span
                    className="shrink-0 rounded-full border font-semibold uppercase tracking-wider"
                    style={{
                      color: 'var(--color-brand-primary)',
                      borderColor: 'color-mix(in oklab, var(--color-brand-primary) 35%, transparent)',
                      backgroundColor:
                        'color-mix(in oklab, var(--color-brand-primary) 12%, var(--color-bg-secondary))',
                      fontSize: focusFontSize,
                      padding: `${Math.max(0, Math.round(2 * fontScale))}px ${Math.max(
                        3,
                        Math.round(6 * fontScale),
                      )}px`,
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
                className="shrink-0 font-mono font-semibold"
                style={{
                  width: valueWidth,
                  textAlign: 'right',
                  color: barColor,
                  fontSize: valueFontSize,
                }}
              >
                {formatItemValue(item, unitPrefix, unitSuffix, valuePrecision)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ClipChart;
