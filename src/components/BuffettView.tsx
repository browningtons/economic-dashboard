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
}

export default function BuffettView({
  buffettData,
  buffettDomainMax,
  buffettZones,
  buffettZoneFillOpacity,
  buffettQuote,
  buffettLabelPoints,
  buffettTooltip,
}: BuffettViewProps) {
  return (
    <Card className="min-h-[760px] flex flex-col">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold text-main">The Buffett Indicator</h2>
            <p className="text-sm text-muted mt-1">Ratio of total US stock market value to GDP.</p>
          </div>
          <div className="flex items-center gap-2 bg-muted-surface border border-theme px-3 py-1 rounded">
            <span className="text-main text-sm font-mono">
              Current: {buffettData.length > 0 ? `${Number(buffettData[buffettData.length - 1].buffettValue).toFixed(1)}%` : 'N/A'}
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {buffettZones.map((zone) => (
            <div key={zone.label} className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full border border-theme bg-secondary">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
              <span className="text-main font-medium">{zone.label}</span>
              <span className="text-muted">{zone.legendRange}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-theme px-4 py-3 shadow-sm" style={{ backgroundColor: 'color-mix(in oklab, var(--color-brand-accent) 10%, var(--color-bg-secondary))' }}>
          <p className="text-lg md:text-xl text-main italic font-semibold leading-snug">"{buffettQuote.text}"</p>
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
}
