import React, { useMemo } from 'react';
import type { ClipItem } from '../types/clips';

interface ClipChartTimeSeriesProps {
  items: ClipItem[];
  unitPrefix?: string;
  unitSuffix?: string;
  valuePrecision?: number;
  fontScale?: number;
  width?: number;
  height?: number;
  compact?: boolean;
}

const formatValue = (value: number, precision = 1, prefix = '', suffix = ''): string => {
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return `${prefix}${formatted}${suffix}`;
};

const formatTickLabel = (label: string): string => {
  const d = new Date(label);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return label.length > 10 ? label.slice(0, 10) : label;
};

const ClipChartTimeSeries = React.memo(function ClipChartTimeSeries({
  items,
  unitPrefix = '',
  unitSuffix = '',
  valuePrecision = 1,
  fontScale = 1,
  width,
  height,
  compact = false,
}: ClipChartTimeSeriesProps) {
  const points = useMemo(
    () =>
      items
        .map((it, i) => ({ item: it, index: i, value: Number(it.value) }))
        .filter((p) => Number.isFinite(p.value)),
    [items],
  );

  const gradientId = useMemo(
    () => `clip-ts-grad-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-subtle bg-muted-surface/60 px-4 py-6 text-center text-sm text-muted">
        Add at least two data points to draw a time-series chart.
      </div>
    );
  }

  const W = width ?? (compact ? 360 : 720);
  const H = height ?? (compact ? 200 : 280);
  const PAD = {
    top: Math.round(20 * fontScale),
    right: Math.round(16 * fontScale),
    bottom: Math.round(28 * fontScale),
    left: Math.round(56 * fontScale),
  };

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || Math.abs(rawMax) || 1;
  const yMin = rawMin - span * 0.08;
  const yMax = rawMax + span * 0.08;
  const yRange = yMax - yMin || 1;

  const xFor = (i: number) =>
    points.length === 1 ? PAD.left + innerW / 2 : PAD.left + (i / (points.length - 1)) * innerW;
  const yFor = (v: number) => PAD.top + innerH - ((v - yMin) / yRange) * innerH;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(2)} ${yFor(p.value).toFixed(2)}`)
    .join(' ');

  const areaD =
    `${pathD} L ${xFor(points.length - 1).toFixed(2)} ${(PAD.top + innerH).toFixed(2)} ` +
    `L ${xFor(0).toFixed(2)} ${(PAD.top + innerH).toFixed(2)} Z`;

  const yTicks = [rawMin, (rawMin + rawMax) / 2, rawMax];

  const tickFont = Math.round(11 * fontScale);
  const labelFont = Math.round(12 * fontScale);
  const focusFont = Math.round(13 * fontScale);

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const highlightPoint = points.find((p) => p.item.highlight) ?? lastPoint;
  const delta = lastPoint.value - firstPoint.value;
  const deltaPct = firstPoint.value !== 0 ? (delta / Math.abs(firstPoint.value)) * 100 : 0;
  const deltaPositive = delta >= 0;

  const xLabelIndices = Array.from(
    new Set([0, Math.floor(points.length / 2), points.length - 1]),
  );

  return (
    <div className="flex w-full flex-col items-stretch" style={{ gap: Math.round(10 * fontScale) }}>
      <div
        className="flex flex-wrap items-baseline justify-between"
        style={{ gap: Math.round(12 * fontScale) }}
      >
        <div className="flex flex-col" style={{ gap: 2 }}>
          <span
            className="uppercase tracking-wider text-muted"
            style={{ fontSize: labelFont }}
          >
            {formatTickLabel(String(highlightPoint.item.label))}
          </span>
          <span
            className="font-mono font-bold"
            style={{
              fontSize: Math.round(28 * fontScale),
              color: 'var(--color-brand-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatValue(
              highlightPoint.value,
              highlightPoint.item.valuePrecision ?? valuePrecision,
              highlightPoint.item.unitPrefix ?? unitPrefix,
              highlightPoint.item.unitSuffix ?? unitSuffix,
            )}
          </span>
        </div>
        <div className="flex flex-col items-end" style={{ gap: 2 }}>
          <span
            className="uppercase tracking-wider text-muted"
            style={{ fontSize: labelFont }}
          >
            Δ vs {formatTickLabel(String(firstPoint.item.label))}
          </span>
          <span
            className="font-mono font-semibold"
            style={{
              fontSize: focusFont,
              color: deltaPositive ? 'var(--color-brand-primary)' : 'var(--color-brand-accent)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {deltaPositive ? '+' : ''}
            {formatValue(delta, valuePrecision, unitPrefix, unitSuffix)} (
            {deltaPositive ? '+' : ''}
            {deltaPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Time-series line chart"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-secondary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-brand-secondary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t, i) => {
          const y = yFor(t);
          return (
            <g key={`tick-${i}`}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="var(--color-border-subtle)"
                strokeWidth={1}
                strokeDasharray={i === 0 || i === yTicks.length - 1 ? undefined : '3 3'}
              />
              <text
                x={PAD.left - 8}
                y={y + 3}
                textAnchor="end"
                style={{
                  fontFamily: 'ui-monospace, Menlo, monospace',
                  fontSize: tickFont,
                  fill: 'var(--color-text-muted)',
                }}
              >
                {formatValue(t, valuePrecision, unitPrefix, unitSuffix)}
              </text>
            </g>
          );
        })}

        <path d={areaD} fill={`url(#${gradientId})`} />

        <path
          d={pathD}
          fill="none"
          stroke="var(--color-brand-secondary)"
          strokeWidth={Math.max(1.5, 2.5 * fontScale)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => {
          const isHighlight = p === highlightPoint;
          const cx = xFor(i);
          const cy = yFor(p.value);
          return (
            <circle
              key={`pt-${i}`}
              cx={cx}
              cy={cy}
              r={isHighlight ? Math.max(4, 5 * fontScale) : Math.max(2, 2.5 * fontScale)}
              fill={isHighlight ? 'var(--color-brand-primary)' : 'var(--color-bg-secondary)'}
              stroke={isHighlight ? 'var(--color-brand-primary)' : 'var(--color-brand-secondary)'}
              strokeWidth={isHighlight ? 2 : 1.5}
            />
          );
        })}

        {xLabelIndices.map((idx) => (
          <text
            key={`xl-${idx}`}
            x={xFor(idx)}
            y={H - PAD.bottom + 16}
            textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: tickFont,
              fill: 'var(--color-text-muted)',
            }}
          >
            {formatTickLabel(String(points[idx].item.label))}
          </text>
        ))}
      </svg>
    </div>
  );
});

export default ClipChartTimeSeries;
