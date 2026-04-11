import React from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Card from './Card';
import DateRangeSlider from './DateRangeSlider';
import type { BuffettLabelPoint, BuffettZone, DataPoint } from '../types/dashboard';

interface BuffettQuote {
  text: string;
  sourceLabel: string;
  sourceUrl: string;
  reason: string;
}

interface BuffettViewProps {
  buffettData: DataPoint[];
  buffettDomainMax: number;
  buffettZones: BuffettZone[];
  buffettZoneFillOpacity: number;
  buffettQuote: BuffettQuote;
  buffettLabelPoints: BuffettLabelPoint[];
  buffettTooltip: React.ReactElement;
  data: DataPoint[];
  dateRange: [number, number];
  handleDateRangeChange: (range: [number, number]) => void;
  datePreset: '1Y' | '3Y' | '5Y' | '10Y' | 'MAX';
  applyDatePreset: (preset: '1Y' | '3Y' | '5Y' | '10Y' | 'MAX') => void;
}

function getZoneForValue(value: number, zones: BuffettZone[]): BuffettZone | null {
  for (const zone of zones) {
    if (value >= zone.min && value < zone.max) return zone;
  }
  // If above all zones, return the last one
  return zones[zones.length - 1] ?? null;
}

const BuffettView = React.memo(function BuffettView({
  buffettData,
  buffettDomainMax,
  buffettZones,
  buffettZoneFillOpacity,
  buffettQuote,
  buffettLabelPoints,
  buffettTooltip,
  data,
  dateRange,
  handleDateRangeChange,
  datePreset,
  applyDatePreset,
}: BuffettViewProps) {
  const currentValue = buffettData.length > 0 ? Number(buffettData[buffettData.length - 1].buffettValue) : null;
  const currentZone = currentValue !== null ? getZoneForValue(currentValue, buffettZones) : null;

  return (
    <Card className="min-h-[760px] flex flex-col">
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h2 className="text-xl font-semibold text-main">The Buffett Indicator</h2>
            <p className="text-sm text-muted mt-1">Ratio of total US stock market value to GDP.</p>
          </div>
          {currentValue !== null && currentZone && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 bg-muted-surface border border-theme px-3 py-1.5 rounded-lg">
                <span className="text-main text-lg font-bold font-mono tabular-nums">
                  {currentValue.toFixed(1)}%
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: currentZone.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentZone.color }} />
                {currentZone.label}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {buffettZones.map((zone) => (
            <div
              key={zone.label}
              className={`inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full border ${currentZone?.label === zone.label ? 'border-current shadow-sm' : 'border-theme bg-secondary'}`}
              style={currentZone?.label === zone.label ? { borderColor: zone.color, backgroundColor: `color-mix(in oklab, ${zone.color} 8%, var(--color-bg-secondary))` } : undefined}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
              <span className="text-main font-medium">{zone.label}</span>
              <span className="text-muted">{zone.legendRange}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-theme px-4 py-3 shadow-sm" style={{ backgroundColor: 'color-mix(in oklab, var(--color-brand-accent) 10%, var(--color-bg-secondary))' }}>
          <p className="text-lg md:text-xl text-main italic font-semibold leading-snug">&ldquo;{buffettQuote.text}&rdquo;</p>
          <p className="text-sm text-muted mt-2">{buffettQuote.reason}</p>
          <a
            href={buffettQuote.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm text-link underline mt-2 text-link-hover"
          >
            {buffettQuote.sourceLabel}
          </a>
        </div>
      </div>

      {/* Date range controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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
        {buffettData.length > 0 && (
          <span className="text-xs text-muted">
            {new Date(buffettData[0].timestamp).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            {' — '}
            {new Date(buffettData[buffettData.length - 1].timestamp).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>
      {data.length > 1 && (
        <div className="mb-4">
          <DateRangeSlider
            min={0}
            max={data.length - 1}
            value={dateRange}
            onChange={handleDateRangeChange}
            data={data}
          />
        </div>
      )}

      <div className="flex-1 w-full min-h-[620px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={buffettData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              stroke="var(--color-chart-axis)"
              fontSize={11}
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
              }}
              tickMargin={15}
              minTickGap={40}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="var(--color-chart-axis)"
              fontSize={11}
              orientation="left"
              tickFormatter={(val) => `${val}%`}
              axisLine={false}
              tickLine={false}
              domain={[45, buffettDomainMax]}
            />
            <Tooltip content={buffettTooltip} />

            {buffettZones.map((zone) => {
              const y2 = zone.label === 'Significantly Overvalued' ? buffettDomainMax : zone.max;
              return (
                <ReferenceArea key={zone.label} y1={zone.min} y2={y2} fill={zone.color} fillOpacity={buffettZoneFillOpacity} />
              );
            })}

            {buffettLabelPoints.map((point) => (
              <ReferenceDot
                key={point.key}
                x={point.timestamp}
                y={point.value}
                r={4}
                fill={point.color}
                stroke="var(--color-bg-secondary)"
                strokeWidth={1.5}
                label={{
                  value: point.label,
                  position: point.position,
                  fill: 'var(--color-text-main)',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
            ))}

            <Line
              type="monotone"
              dataKey="buffettValue"
              name="Buffett Indicator"
              stroke="#0F172A"
              strokeWidth={4.2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#F04A00' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});

export default BuffettView;
