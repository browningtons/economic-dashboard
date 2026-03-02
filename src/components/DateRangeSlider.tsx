import React from 'react';
import type { DataPoint } from '../types/dashboard';

interface DateRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (val: [number, number]) => void;
  data: DataPoint[];
}

export default function DateRangeSlider({ min, max, value, onChange, data }: DateRangeSliderProps) {
  if (max <= min) return null;

  const total = max - min;
  const leftPercent = ((value[0] - min) / total) * 100;
  const rightPercent = ((value[1] - min) / total) * 100;

  const formatLabel = (idx: number) => {
    const point = data[idx];
    if (!point) return '';
    return new Date(point.timestamp).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  };

  const onMinChange = (nextRaw: number) => {
    const next = Math.max(min, Math.min(nextRaw, value[1] - 1));
    onChange([next, value[1]]);
  };

  const onMaxChange = (nextRaw: number) => {
    const next = Math.min(max, Math.max(nextRaw, value[0] + 1));
    onChange([value[0], next]);
  };

  return (
    <div className="mb-3 rounded-lg border border-theme/50 px-3 py-2" style={{ backgroundColor: 'color-mix(in oklab, var(--color-surface-muted) 38%, transparent)' }}>
      <div className="mb-1 flex items-center justify-between text-[10px] text-muted/80">
        <span>{formatLabel(value[0])}</span>
        <span>{formatLabel(value[1])}</span>
      </div>

      <div className="relative h-6">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ backgroundColor: 'color-mix(in oklab, var(--color-text-muted) 16%, transparent)' }} />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{
            left: `${leftPercent}%`,
            right: `${100 - rightPercent}%`,
            backgroundColor: 'color-mix(in oklab, var(--color-brand-secondary) 34%, transparent)',
          }}
        />

        <input
          type="range"
          min={min}
          max={max}
          value={value[0]}
          onChange={(e) => onMinChange(Number(e.target.value))}
          className="range-input pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent"
          aria-label="Start date"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value[1]}
          onChange={(e) => onMaxChange(Number(e.target.value))}
          className="range-input pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent"
          aria-label="End date"
        />
      </div>
    </div>
  );
}
