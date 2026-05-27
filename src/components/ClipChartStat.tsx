import React, { useMemo } from 'react';
import type { ClipItem } from '../types/clips';

interface ClipChartStatProps {
  items: ClipItem[];
  unitPrefix?: string;
  unitSuffix?: string;
  valuePrecision?: number;
  fontScale?: number;
  compact?: boolean;
}

const formatValue = (value: number, precision = 1, prefix = '', suffix = ''): string => {
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return `${prefix}${formatted}${suffix}`;
};

/** Resolve unitPrefix / unitSuffix / valuePrecision with item-level overrides
 *  taking precedence over the clip-level defaults. */
const formatItemValue = (
  item: ClipItem,
  clipPrefix: string,
  clipSuffix: string,
  clipPrecision: number,
): string => {
  const prefix = item.unitPrefix ?? clipPrefix;
  const suffix = item.unitSuffix ?? clipSuffix;
  const precision = item.valuePrecision ?? clipPrecision;
  return formatValue(item.value, precision, prefix, suffix);
};

const ClipChartStat = React.memo(function ClipChartStat({
  items,
  unitPrefix = '',
  unitSuffix = '',
  valuePrecision = 1,
  fontScale = 1,
  compact = false,
}: ClipChartStatProps) {
  const { headline, supporting } = useMemo(() => {
    if (!items.length) {
      return { headline: null as ClipItem | null, supporting: [] as ClipItem[] };
    }
    const highlightIdx = items.findIndex((it) => it.highlight);
    const headlineIdx = highlightIdx >= 0 ? highlightIdx : 0;
    return {
      headline: items[headlineIdx],
      supporting: items.filter((_, i) => i !== headlineIdx).slice(0, 3),
    };
  }, [items]);

  if (!headline) {
    return (
      <div className="rounded-lg border border-subtle bg-muted-surface/60 px-4 py-6 text-center text-sm text-muted">
        Add at least one item to populate the stat card.
      </div>
    );
  }

  const headlineSize = Math.round((compact ? 64 : 96) * fontScale);
  const labelSize = Math.round((compact ? 13 : 16) * fontScale);
  const supportLabelSize = Math.round(11 * fontScale);
  const supportValueSize = Math.round((compact ? 20 : 26) * fontScale);

  return (
    <div className="flex w-full flex-col items-center justify-center text-center" style={{ gap: Math.round(16 * fontScale) }}>
      <div
        className="font-semibold uppercase tracking-[0.18em] text-muted"
        style={{ fontSize: labelSize }}
      >
        {headline.label}
      </div>

      <div
        className="font-bold leading-none"
        style={{
          fontSize: headlineSize,
          color: 'var(--color-brand-primary)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        {formatItemValue(headline, unitPrefix, unitSuffix, valuePrecision)}
      </div>

      {supporting.length > 0 && (
        <div
          className="mt-2 grid w-full max-w-3xl border-t border-subtle pt-4"
          style={{
            gridTemplateColumns: `repeat(${supporting.length}, minmax(0, 1fr))`,
            gap: Math.round(16 * fontScale),
          }}
        >
          {supporting.map((item, i) => (
            <div key={`${item.label}-${i}`} className="flex flex-col items-center text-center" style={{ gap: 4 }}>
              <div
                className="uppercase tracking-wider text-muted"
                style={{ fontSize: supportLabelSize }}
              >
                {item.label}
              </div>
              <div
                className="font-mono font-semibold"
                style={{
                  fontSize: supportValueSize,
                  color: item.highlight ? 'var(--color-brand-primary)' : 'var(--color-brand-secondary)',
                }}
              >
                {formatItemValue(item, unitPrefix, unitSuffix, valuePrecision)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default ClipChartStat;
