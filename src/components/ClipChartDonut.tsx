import React, { useMemo } from 'react';
import type { ClipItem } from '../types/clips';

interface ClipChartDonutProps {
  items: ClipItem[];
  unitPrefix?: string;
  unitSuffix?: string;
  valuePrecision?: number;
  fontScale?: number;
  size?: number;
  compact?: boolean;
}

const SLICE_PALETTE = [
  '#0F3D57',
  '#2CB6C0',
  '#F04A00',
  '#4C6F86',
  '#0E7C86',
  '#FF7A33',
  '#B53300',
  '#082535',
];

const TAU = Math.PI * 2;

const polar = (cx: number, cy: number, r: number, angle: number) => ({
  x: cx + r * Math.cos(angle - Math.PI / 2),
  y: cy + r * Math.sin(angle - Math.PI / 2),
});

const arcPath = (
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string => {
  const sweep = endAngle - startAngle;
  if (sweep <= 0) return '';
  const largeArc = sweep > Math.PI ? 1 : 0;
  const so = polar(cx, cy, rOuter, startAngle);
  const eo = polar(cx, cy, rOuter, endAngle);
  const si = polar(cx, cy, rInner, endAngle);
  const ei = polar(cx, cy, rInner, startAngle);
  return [
    `M ${so.x} ${so.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${eo.x} ${eo.y}`,
    `L ${si.x} ${si.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${ei.x} ${ei.y}`,
    'Z',
  ].join(' ');
};

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

const ClipChartDonut = React.memo(function ClipChartDonut({
  items,
  unitPrefix = '',
  unitSuffix = '',
  valuePrecision = 1,
  fontScale = 1,
  size,
  compact = false,
}: ClipChartDonutProps) {
  const { slices, total } = useMemo(() => {
    const visible = items.slice(0, 8);
    const tot = visible.reduce((s, it) => s + Math.max(0, Number(it.value) || 0), 0);
    if (tot <= 0) return { slices: [], total: 0 };
    let cumulative = 0;
    const computed = visible.map((item, i) => {
      const value = Math.max(0, Number(item.value) || 0);
      const fraction = value / tot;
      const start = cumulative * TAU;
      cumulative += fraction;
      const end = cumulative * TAU;
      return {
        item,
        fraction,
        start,
        end,
        color: SLICE_PALETTE[i % SLICE_PALETTE.length],
      };
    });
    return { slices: computed, total: tot };
  }, [items]);

  if (slices.length === 0) {
    return (
      <div className="rounded-lg border border-subtle bg-muted-surface/60 px-4 py-6 text-center text-sm text-muted">
        Add at least one item with a positive value to build the donut.
      </div>
    );
  }

  const donutSize = size ?? (compact ? 180 : 260);
  const cx = donutSize / 2;
  const cy = donutSize / 2;
  const rOuter = donutSize / 2 - 4;
  const rInner = rOuter * 0.62;
  const labelFont = Math.round(13 * fontScale);
  const valueFont = Math.round(15 * fontScale);
  const totalLabelFont = Math.round((compact ? 10 : 11) * fontScale);
  const totalValueFont = Math.round((compact ? 18 : 22) * fontScale);

  return (
    <div className="flex w-full flex-wrap items-center justify-center" style={{ gap: Math.round(20 * fontScale) }}>
      <div className="relative shrink-0" style={{ width: donutSize, height: donutSize }}>
        <svg
          width={donutSize}
          height={donutSize}
          viewBox={`0 0 ${donutSize} ${donutSize}`}
          role="img"
          aria-label="Donut chart"
        >
          {slices.map((slice, i) => {
            const isHighlight = slice.item.highlight;
            return (
              <path
                key={`${slice.item.label}-${i}`}
                d={arcPath(cx, cy, rOuter, rInner, slice.start, slice.end)}
                fill={slice.color}
                stroke="var(--color-bg-secondary)"
                strokeWidth={2}
                style={{
                  filter: isHighlight ? 'drop-shadow(0 0 6px rgba(240,74,0,0.35))' : undefined,
                  transformOrigin: `${cx}px ${cy}px`,
                  transform: isHighlight ? 'scale(1.03)' : undefined,
                }}
              />
            );
          })}
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
          style={{ gap: 2 }}
        >
          <span
            className="uppercase tracking-wider text-muted"
            style={{ fontSize: totalLabelFont }}
          >
            Total
          </span>
          <span
            className="font-bold text-main font-mono"
            style={{ fontSize: totalValueFont, fontVariantNumeric: 'tabular-nums' }}
          >
            {formatValue(total, valuePrecision, unitPrefix, unitSuffix)}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col" style={{ gap: Math.round(8 * fontScale) }}>
        {slices.map((slice, i) => {
          const pct = (slice.fraction * 100).toFixed(slice.fraction < 0.1 ? 1 : 0);
          return (
            <div
              key={`${slice.item.label}-${i}-legend`}
              className="flex items-center"
              style={{ gap: Math.round(10 * fontScale) }}
            >
              <span
                className="shrink-0 rounded-sm"
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor: slice.color,
                  border: slice.item.highlight
                    ? '2px solid var(--color-brand-primary)'
                    : 'none',
                }}
                aria-hidden
              />
              <div className="flex flex-1 items-baseline" style={{ gap: Math.round(8 * fontScale) }}>
                <span
                  className={`truncate ${slice.item.highlight ? 'font-semibold' : 'font-medium'}`}
                  style={{ fontSize: labelFont, color: 'var(--color-text-main)' }}
                >
                  {slice.item.label}
                </span>
                <span
                  className="font-mono text-muted"
                  style={{ fontSize: labelFont }}
                >
                  {pct}%
                </span>
              </div>
              <span
                className="font-mono font-semibold"
                style={{
                  fontSize: valueFont,
                  color: slice.item.highlight
                    ? 'var(--color-brand-primary)'
                    : 'var(--color-brand-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatItemValue(slice.item, unitPrefix, unitSuffix, valuePrecision)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ClipChartDonut;
